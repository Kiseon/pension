import type { ProjectionFormState, ProjectionRequestPayload } from "../types/projection";

export const DEFAULT_FORM_STATE: ProjectionFormState = {
  userBirthDate: "1975-04-15",
  spouseBirthDate: "1978-09-10",
  startMonth: "2026-04",
  retirementAge: 60,
  monthlyLivingExpense: 3_500_000,

  monthlyNetIncome: 5_200_000,
  monthlyGrossIncomeForTax: null,
  incomeGrowthRate: 2.0,
  retirementAllowance: 120_000_000,
  voluntaryRetirementBonus: 40_000_000,
  retirementPayoutStartYear: 2035,
  retirementPayoutEndYear: 2044,

  realEstateIncome: 1_300_000,
  realEstateGrowth: 1.5,

  nationalPensionAmount: 1_500_000,
  nationalPensionStartAge: 65,
  spouseNationalPensionAmount: 1_000_000,
  spouseNationalPensionStartAge: 65,
  apartmentValue: 900_000_000,
  housingPensionStartAge: 70,
  jointHomeOwnership: true,

  irpBalance: 50_000_000,
  irpContribution: 500_000,
  irpPayoutStartYear: 2035,
  irpPayoutEndYear: 2054,
  spouseIrpBalance: 30_000_000,
  spouseIrpContribution: 300_000,
  spouseIrpPayoutStartYear: 2037,
  spouseIrpPayoutEndYear: 2056,
  irpReturn: 4.0,

  stockBalance: 80_000_000,
  stockReturn: 5.0,
  monthlyFinancialIncome: 200_000,
  stockAllocationRate: 50,

  inflationRate: 2.0
};

export interface PresetOption {
  id: string;
  label: string;
  description: string;
  patch: Partial<ProjectionFormState>;
}

export const INPUT_PRESETS: PresetOption[] = [
  {
    id: "standard-couple",
    label: "맞벌이 표준 가구",
    description: "60세 은퇴 · 국민연금 65세 · 주택연금 70세",
    patch: DEFAULT_FORM_STATE
  },
  {
    id: "early-retirement",
    label: "조기 희망퇴직",
    description: "55세 은퇴 · 희망퇴직위로금 · 연금 65세까지 브릿지",
    patch: {
      ...DEFAULT_FORM_STATE,
      retirementAge: 55,
      voluntaryRetirementBonus: 120_000_000,
      retirementPayoutStartYear: 2030,
      retirementPayoutEndYear: 2040,
      irpPayoutStartYear: 2031,
      irpPayoutEndYear: 2050
    }
  },
  {
    id: "single-householder",
    label: "1인 가구",
    description: "배우자 미입력 · 단독명의 기준",
    patch: {
      ...DEFAULT_FORM_STATE,
      spouseBirthDate: "",
      spouseNationalPensionAmount: 0,
      spouseIrpBalance: 0,
      spouseIrpContribution: 0,
      jointHomeOwnership: false,
      monthlyLivingExpense: 2_600_000
    }
  }
];

export function formatKrw(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("ko-KR");
}

export function formatCompactKrw(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0원";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));

  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const man = Math.round((abs % 100_000_000) / 10_000);
    if (man === 0) return `${sign}${eok.toLocaleString("ko-KR")}억원`;
    return `${sign}${eok.toLocaleString("ko-KR")}억 ${man.toLocaleString("ko-KR")}만원`;
  }
  if (abs >= 10_000) {
    const man = Math.round(abs / 10_000);
    return `${sign}${man.toLocaleString("ko-KR")}만원`;
  }
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[^\d-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildPayload(form: ProjectionFormState): ProjectionRequestPayload {
  const pensions: ProjectionRequestPayload["pensions"] = [];

  if (form.userBirthDate && form.nationalPensionAmount > 0) {
    pensions.push({
      name: "국민연금",
      type: "national_pension",
      target_monthly_amount: form.nationalPensionAmount,
      owner_birth_date: form.userBirthDate,
      start_age: form.nationalPensionStartAge,
      annual_increase_rate: 0
    });
  }

  if (form.spouseBirthDate && form.spouseNationalPensionAmount > 0) {
    pensions.push({
      name: "배우자 국민연금",
      type: "national_pension",
      target_monthly_amount: form.spouseNationalPensionAmount,
      owner_birth_date: form.spouseBirthDate,
      start_age: form.spouseNationalPensionStartAge,
      annual_increase_rate: 0
    });
  }

  if (form.userBirthDate) {
    pensions.push({
      name: "주택연금",
      type: "housing_pension",
      target_monthly_amount: 0,
      owner_birth_date: form.userBirthDate,
      spouse_birth_date: form.spouseBirthDate || undefined,
      start_age: form.housingPensionStartAge,
      home_value: form.apartmentValue,
      ownership_share: form.jointHomeOwnership ? 0.5 : 1,
      annual_increase_rate: 0
    });
  }

  return {
    household: {
      user_birth_date: form.userBirthDate,
      spouse_birth_date: form.spouseBirthDate || undefined
    },
    start_month: form.startMonth,
    employment: {
      currently_employed: form.monthlyNetIncome > 0,
      monthly_net_income: form.monthlyNetIncome,
      monthly_gross_income_for_tax: form.monthlyGrossIncomeForTax ?? 0,
      income_growth_rate: form.incomeGrowthRate / 100,
      retirement_age: form.retirementAge,
      retirement_allowance: form.retirementAllowance,
      voluntary_retirement_bonus: form.voluntaryRetirementBonus,
      retirement_payout_start_year: form.retirementPayoutStartYear,
      retirement_payout_end_year: form.retirementPayoutEndYear
    },
    real_estate: [
      {
        name: "부동산 월수입",
        monthly_income: form.realEstateIncome,
        income_growth_rate: form.realEstateGrowth / 100
      }
    ],
    pensions,
    financial_assets: [
      {
        name: "주식/투자",
        balance: form.stockBalance,
        annual_return_rate: form.stockReturn / 100,
        monthly_income: form.monthlyFinancialIncome
      }
    ],
    irp: {
      current_balance: form.irpBalance,
      monthly_contribution: form.irpContribution,
      payout_start_year: form.irpPayoutStartYear,
      payout_end_year: form.irpPayoutEndYear,
      spouse_current_balance: form.spouseIrpBalance,
      spouse_monthly_contribution: form.spouseIrpContribution,
      spouse_payout_start_year: form.spouseIrpPayoutStartYear,
      spouse_payout_end_year: form.spouseIrpPayoutEndYear,
      annual_return_rate: form.irpReturn / 100
    },
    housing_pension: {
      apartment_market_value: form.apartmentValue,
      start_age: form.housingPensionStartAge,
      joint_ownership: form.jointHomeOwnership
    },
    expenses: {
      monthly_living_expense: form.monthlyLivingExpense,
      stock_allocation_rate: form.stockAllocationRate / 100
    },
    assumptions: {
      inflation_rate: form.inflationRate / 100
    }
  };
}
