const form = document.querySelector("#projection-form");
const summary = document.querySelector("#summary");
const tableBody = document.querySelector("#monthly-rows");

initializeMoneyInputs();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  summary.textContent = "계산 중...";
  tableBody.innerHTML = "";

  const payload = payloadFromForm(new FormData(form));

  try {
    const response = await fetch("/api/projections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Projection failed");
    }
    renderResult(data);
  } catch (error) {
    summary.innerHTML = `<div class="error">계산 실패: ${escapeHtml(error.message)}</div>`;
  }
});

function payloadFromForm(data) {
  const userBirthDate = textValue(data, "user_birth_date");
  const spouseBirthDate = textValue(data, "spouse_birth_date");
  const retirementAge = numberValue(data, "retirement_age");

  const pensions = [
    {
      name: "국민연금",
      type: "national_pension",
      target_monthly_amount: numberValue(data, "national_pension_amount"),
      start_age: numberValue(data, "national_pension_start_age"),
      annual_increase_rate: 0
    },
    {
      name: "주택연금",
      type: "housing_pension",
      target_monthly_amount: numberValue(data, "housing_pension_amount"),
      start_age: numberValue(data, "housing_pension_start_age"),
      annual_increase_rate: 0
    }
  ].filter((item) => item.target_monthly_amount > 0);

  return {
    household: {
      user_birth_date: userBirthDate,
      spouse_birth_date: spouseBirthDate || undefined
    },
    start_month: textValue(data, "start_month"),
    target_monthly_income: numberValue(data, "target_monthly_income"),
    employment: {
      currently_employed: numberValue(data, "monthly_net_income") > 0,
      monthly_net_income: numberValue(data, "monthly_net_income"),
      income_growth_rate: percentValue(data, "income_growth_rate"),
      retirement_age: retirementAge,
      retirement_allowance: numberValue(data, "retirement_allowance"),
      voluntary_retirement_bonus: numberValue(data, "voluntary_retirement_bonus")
    },
    real_estate: [
      {
        name: "부동산 월수입",
        monthly_income: numberValue(data, "real_estate_income"),
        monthly_expense: numberValue(data, "real_estate_expense"),
        income_growth_rate: percentValue(data, "real_estate_growth"),
        expense_growth_rate: percentValue(data, "real_estate_growth")
      }
    ],
    pensions,
    financial_assets: [
      {
        name: "주식/투자",
        balance: numberValue(data, "stock_balance"),
        annual_return_rate: percentValue(data, "stock_return"),
        monthly_income: numberValue(data, "monthly_financial_income")
      }
    ],
    irp: {
      current_balance: numberValue(data, "irp_balance"),
      monthly_contribution: numberValue(data, "irp_contribution"),
      annual_return_rate: percentValue(data, "irp_return")
    },
    assumptions: {
      inflation_rate: percentValue(data, "inflation_rate")
    }
  };
}

function renderResult(data) {
  if (!data.monthly || data.monthly.length === 0) {
    summary.innerHTML = `<div class="error">계산 결과가 비어 있습니다.</div>`;
    return;
  }

  summary.innerHTML = `
    <div><strong>기간</strong>: ${data.projection_start} ~ ${data.projection_end}</div>
    <div><strong>목표 월수입</strong>: ${formatKrw(data.target_monthly_income)}</div>
    <div><strong>입력 신뢰도</strong>: ${data.confidence_score}점</div>
    <div><strong>추천</strong>: ${data.recommendation.summary}</div>
    <div><strong>은퇴시점 추가 필요액</strong>: ${formatKrw(data.recommendation.additional_savings_needed_at_retirement)}</div>
    <div><strong>월 추가 저축 필요액</strong>: ${formatKrw(data.recommendation.monthly_additional_savings_until_retirement)}</div>
    <div><strong>자산 소진 예상월</strong>: ${data.recommendation.depletion_month || "없음"}</div>
  `;

  for (const row of data.monthly.slice(0, 240)) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${row.user_age}</td>
      <td>${formatKrw(row.nominal_total)}</td>
      <td>${formatKrw(row.real_total)}</td>
      <td>${formatKrw(row.target_shortfall)}</td>
      <td>${formatKrw(row.remaining_financial_assets)}</td>
    `;
    tableBody.appendChild(tr);
  }
}

function initializeMoneyInputs() {
  for (const input of document.querySelectorAll('[data-format="money"]')) {
    input.value = formatNumber(input.value);
    input.addEventListener("blur", () => {
      input.value = formatNumber(input.value);
    });
  }
}

function textValue(data, name) {
  return String(data.get(name) || "").trim();
}

function numberValue(data, name) {
  return Number(stripNumberFormatting(data.get(name)) || 0);
}

function percentValue(data, name) {
  return numberValue(data, name) / 100;
}

function formatKrw(value) {
  return `${formatNumber(value)}원`;
}

function formatNumber(value) {
  const text = stripNumberFormatting(value);
  if (!text) {
    return "0";
  }
  return Number(text).toLocaleString("ko-KR");
}

function stripNumberFormatting(value) {
  return String(value || "").replaceAll(",", "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
