const form = document.querySelector("#projection-form");
const summary = document.querySelector("#summary");
const tableHead = document.querySelector("#projection-head");
const tableBody = document.querySelector("#projection-body");

initializeMoneyInputs();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  summary.textContent = "계산 중...";
  tableHead.innerHTML = "";
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
      owner_birth_date: userBirthDate,
      start_age: numberValue(data, "national_pension_start_age"),
      annual_increase_rate: 0
    },
    {
      name: "배우자 국민연금",
      type: "national_pension",
      target_monthly_amount: numberValue(data, "spouse_national_pension_amount"),
      owner_birth_date: spouseBirthDate,
      start_age: numberValue(data, "spouse_national_pension_start_age"),
      annual_increase_rate: 0
    },
    {
      name: "주택연금",
      type: "housing_pension",
      target_monthly_amount: 0,
      owner_birth_date: userBirthDate,
      start_age: numberValue(data, "housing_pension_start_age"),
      home_value: numberValue(data, "apartment_value"),
      ownership_share: data.get("joint_home_ownership") === "on" ? 0.5 : 1,
      annual_increase_rate: 0
    }
  ].filter((item) => item.owner_birth_date && (item.target_monthly_amount > 0 || item.type === "housing_pension"));

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
      voluntary_retirement_bonus: numberValue(data, "voluntary_retirement_bonus"),
      retirement_payout_start_year: numberValue(data, "retirement_payout_start_year"),
      retirement_payout_end_year: numberValue(data, "retirement_payout_end_year")
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
      payout_start_year: numberValue(data, "irp_payout_start_year"),
      payout_end_year: numberValue(data, "irp_payout_end_year"),
      spouse_current_balance: numberValue(data, "spouse_irp_balance"),
      spouse_monthly_contribution: numberValue(data, "spouse_irp_contribution"),
      spouse_payout_start_year: numberValue(data, "spouse_irp_payout_start_year"),
      spouse_payout_end_year: numberValue(data, "spouse_irp_payout_end_year"),
      annual_return_rate: percentValue(data, "irp_return")
    },
    housing_pension: {
      apartment_market_value: numberValue(data, "apartment_value"),
      start_age: numberValue(data, "housing_pension_start_age"),
      joint_ownership: data.get("joint_home_ownership") === "on"
    },
    expenses: {
      monthly_living_expense: numberValue(data, "monthly_living_expense"),
      stock_allocation_rate: percentValue(data, "stock_allocation_rate")
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

  renderBreakdownTable(data.monthly);
}

function renderBreakdownTable(months) {
  const sources = buildBreakdownRows(months);
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th class="sticky-col">구분</th>
    ${months.map((row) => `<th>${row.month}</th>`).join("")}
  `;
  tableHead.appendChild(headerRow);

  for (const source of sources) {
    const tr = document.createElement("tr");
    tr.className = source.kind === "expense" ? "expense-row" : "";
    tr.innerHTML = `
      <th class="sticky-col">
        <span class="row-kind">${source.kindLabel}</span>
        ${escapeHtml(source.label)}
      </th>
      ${months.map((row) => `<td>${formatKrw(source.values.get(row.month) || 0)}</td>`).join("")}
    `;
    tableBody.appendChild(tr);
  }
}

function buildBreakdownRows(months) {
  const rows = new Map();
  for (const month of months) {
    for (const line of month.lines || []) {
      const key = `${line.category}:${line.source}`;
      if (!rows.has(key)) {
        rows.set(key, {
          label: line.source,
          kind: line.amount < 0 ? "expense" : "income",
          kindLabel: line.amount < 0 ? "지출" : "수입",
          values: new Map()
        });
      }
      rows.get(key).values.set(month.month, line.amount);
    }

    addSummaryRow(rows, "summary:nominal", "월 총수입", "summary", "합계", month.month, month.nominal_total);
    addSummaryRow(rows, "summary:shortfall", "목표 대비 부족액", "summary", "부족", month.month, month.target_shortfall);
    addSummaryRow(rows, "summary:assets", "잔여 금융자산", "summary", "잔액", month.month, month.remaining_financial_assets);
    addSummaryRow(rows, "summary:stock", "주식잔고", "summary", "잔액", month.month, month.stock_balance);
  }

  return Array.from(rows.values()).sort((left, right) => {
    const rank = { income: 1, expense: 2, summary: 3 };
    return rank[left.kind] - rank[right.kind] || left.label.localeCompare(right.label, "ko");
  });
}

function addSummaryRow(rows, key, label, kind, kindLabel, month, value) {
  if (!rows.has(key)) {
    rows.set(key, { label, kind, kindLabel, values: new Map() });
  }
  rows.get(key).values.set(month, value);
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
  return formatNumber(value);
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
