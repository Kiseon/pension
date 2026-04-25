const samplePayload = {
  household: {
    user_birth_date: "1975-03-15",
    spouse_birth_date: "1977-08-20"
  },
  start_month: "2026-04",
  target_monthly_income: 4500000,
  employment: {
    currently_employed: true,
    monthly_net_income: 5200000,
    income_growth_rate: 0.02,
    retirement_age: 60,
    retirement_allowance: 120000000,
    voluntary_retirement_bonus: 30000000
  },
  real_estate: [
    {
      name: "임대 부동산",
      monthly_income: 1500000,
      monthly_expense: 350000,
      income_growth_rate: 0.02,
      expense_growth_rate: 0.02
    }
  ],
  pensions: [
    {
      name: "국민연금",
      type: "national_pension",
      target_monthly_amount: 1400000,
      start_age: 65,
      annual_increase_rate: 0.02
    },
    {
      name: "개인연금",
      type: "private_pension",
      target_monthly_amount: 600000,
      start_age: 60,
      annual_increase_rate: 0.01
    }
  ],
  financial_assets: [
    {
      name: "주식 투자",
      balance: 90000000,
      annual_return_rate: 0.05,
      monthly_income: 0
    },
    {
      name: "예금",
      balance: 40000000,
      annual_return_rate: 0.03,
      monthly_income: 100000
    }
  ],
  irp: {
    current_balance: 35000000,
    monthly_contribution: 500000,
    annual_return_rate: 0.04
  },
  assumptions: {
    inflation_rate: 0.025
  }
};

const input = document.querySelector("#payload");
const output = document.querySelector("#output");
const summary = document.querySelector("#summary");
const tableBody = document.querySelector("#monthly-table tbody");

input.value = JSON.stringify(samplePayload, null, 2);

document.querySelector("#run").addEventListener("click", async () => {
  output.textContent = "계산 중...";
  summary.innerHTML = "";
  tableBody.innerHTML = "";

  let payload;
  try {
    payload = JSON.parse(input.value);
  } catch (error) {
    output.textContent = `JSON 입력 오류: ${error.message}`;
    return;
  }

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
    output.textContent = `계산 실패: ${error.message}`;
  }
});

function renderResult(data) {
  output.textContent = JSON.stringify(data, null, 2);
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

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}
