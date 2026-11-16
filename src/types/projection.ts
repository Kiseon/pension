export interface ProjectionFormState {
  // 가구 및 기본
  userBirthDate: string;
  spouseBirthDate: string;
  startMonth: string;
  retirementAge: number;
  monthlyLivingExpense: number;

  // 근로 및 퇴직
  monthlyNetIncome: number;
  monthlyGrossIncomeForTax: number | null;
  incomeGrowthRate: number; // % e.g. 2.0
  retirementAllowance: number;
  voluntaryRetirementBonus: number;
  retirementPayoutStartYear: number;
  retirementPayoutEndYear: number;

  // 부동산
  realEstateIncome: number;
  realEstateGrowth: number; // % e.g. 1.5

  // 연금
  nationalPensionAmount: number;
  nationalPensionStartAge: number;
  spouseNationalPensionAmount: number;
  spouseNationalPensionStartAge: number;
  apartmentValue: number;
  housingPensionStartAge: number;
  jointHomeOwnership: boolean;

  // IRP 및 투자
  irpBalance: number;
  irpContribution: number;
  irpPayoutStartYear: number;
  irpPayoutEndYear: number;
  spouseIrpBalance: number;
  spouseIrpContribution: number;
  spouseIrpPayoutStartYear: number;
  spouseIrpPayoutEndYear: number;
  irpReturn: number; // % e.g. 4.0

  stockBalance: number;
  stockReturn: number; // % e.g. 5.0
  monthlyFinancialIncome: number;
  stockAllocationRate: number; // % e.g. 50

  // 가정
  inflationRate: number; // % e.g. 2.0
}

export interface ProjectionRequestPayload {
  household: {
    user_birth_date: string;
    spouse_birth_date?: string;
  };
  start_month: string;
  employment: {
    currently_employed: boolean;
    monthly_net_income: number;
    monthly_gross_income_for_tax: number;
    income_growth_rate: number;
    retirement_age: number;
    retirement_allowance: number;
    voluntary_retirement_bonus: number;
    retirement_payout_start_year: number;
    retirement_payout_end_year: number;
  };
  real_estate: Array<{
    name: string;
    monthly_income: number;
    income_growth_rate: number;
  }>;
  pensions: Array<{
    name: string;
    type: "national_pension" | "housing_pension" | "private_pension";
    target_monthly_amount: number;
    owner_birth_date: string;
    spouse_birth_date?: string;
    start_age: number;
    home_value?: number;
    ownership_share?: number;
    annual_increase_rate: number;
  }>;
  financial_assets: Array<{
    name: string;
    balance: number;
    annual_return_rate: number;
    monthly_income: number;
  }>;
  irp: {
    current_balance: number;
    monthly_contribution: number;
    payout_start_year: number;
    payout_end_year: number;
    spouse_current_balance: number;
    spouse_monthly_contribution: number;
    spouse_payout_start_year: number;
    spouse_payout_end_year: number;
    annual_return_rate: number;
  };
  housing_pension: {
    apartment_market_value: number;
    start_age: number;
    joint_ownership: boolean;
  };
  expenses: {
    monthly_living_expense: number;
    stock_allocation_rate: number;
  };
  assumptions: {
    inflation_rate: number;
  };
}

export interface ProjectionLine {
  source: string;
  amount: number;
  category: string;
}

export interface MonthlyProjectionRow {
  month: string;
  user_age: number;
  spouse_age: number | null;
  nominal_total: number;
  real_total: number;
  remaining_financial_assets: number;
  cash_balance: number;
  stock_balance: number;
  retirement_balance: number;
  lines: ProjectionLine[];
}

export interface ProjectionRecommendation {
  summary: string;
  additional_savings_needed_at_retirement: number;
  depletion_month: string | null;
}

export interface ProjectionResponse {
  currency: string;
  market: string;
  projection_start: string;
  projection_end: string;
  confidence_score: number;
  warnings: string[];
  recommendation: ProjectionRecommendation;
  monthly: MonthlyProjectionRow[];
  rule_versions: Record<string, string>;
}

export type ValuationMode = "nominal" | "real";
export type ResultTab = "overview" | "scenarios" | "table" | "reliability";

export interface ScenarioComparisonItem {
  id: "base" | "conservative" | "optimistic";
  label: string;
  description: string;
  inflationDelta: number;
  returnDelta: number;
  response: ProjectionResponse | null;
  error?: string;
}
