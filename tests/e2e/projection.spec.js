const { test, expect } = require("@playwright/test");

test("calculates projection and renders React dashboard views", async ({ page }) => {
  await page.goto("/");

  // 1. 가구·은퇴 탭
  await page.locator('[name="user_birth_date"]').fill("1976-02-14");
  await page.locator('[name="spouse_birth_date"]').fill("1978-07-09");
  await page.locator('[name="start_month"]').fill("2026-05");
  await page.locator('[name="retirement_age"]').fill("58");
  await page.locator('[name="monthly_living_expense"]').fill("12,000,000");

  // 2. 근로·퇴직 탭
  await page.getByRole("button", { name: "근로·퇴직" }).click();
  await page.locator('[name="monthly_net_income"]').fill("6,100,000");
  await page.locator('[name="income_growth_rate"]').fill("2.5");
  await page.locator('[name="retirement_allowance"]').fill("150,000,000");
  await page.locator('[name="voluntary_retirement_bonus"]').fill("25,000,000");
  await page.locator('[name="retirement_payout_start_year"]').fill("2034");
  await page.locator('[name="retirement_payout_end_year"]').fill("2055");

  // 3. 연금·부동산 탭
  await page.getByRole("button", { name: "연금·부동산" }).click();
  await page.locator('[name="national_pension_amount"]').fill("1,550,000");
  await page.locator('[name="national_pension_start_age"]').fill("65");
  await page.locator('[name="spouse_national_pension_amount"]').fill("900,000");
  await page.locator('[name="spouse_national_pension_start_age"]').fill("65");
  await page.locator('[name="apartment_value"]').fill("700,000,000");
  await page.locator('[name="joint_home_ownership"]').check();
  await page.locator('[name="housing_pension_start_age"]').fill("70");
  await page.locator('[name="real_estate_income"]').fill("1,600,000");
  await page.locator('[name="real_estate_growth"]').fill("1.8");

  // 4. IRP·투자 탭
  await page.getByRole("button", { name: "IRP·투자" }).click();
  await page.locator('[name="irp_balance"]').fill("70,000,000");
  await page.locator('[name="irp_contribution"]').fill("600,000");
  await page.locator('[name="irp_payout_start_year"]').fill("2037");
  await page.locator('[name="irp_payout_end_year"]').fill("2056");
  await page.locator('[name="spouse_irp_balance"]').fill("45,000,000");
  await page.locator('[name="spouse_irp_contribution"]').fill("300,000");
  await page.locator('[name="spouse_irp_payout_start_year"]').fill("2039");
  await page.locator('[name="spouse_irp_payout_end_year"]').fill("2058");
  await page.locator('[name="irp_return"]').fill("4.2");
  await page.locator('[name="stock_balance"]').fill("900,000,000");
  await page.locator('[name="stock_return"]').fill("5.5");
  await page.locator('[name="monthly_financial_income"]').fill("250,000");
  await page.locator('[name="inflation_rate"]').fill("2.2");

  await page.getByRole("button", { name: "프로젝션 계산" }).click();

  // KPI & 개요 차트 검증
  await expect(page.locator(".kpi-grid")).toContainText("은퇴 시점(58세) 월 수지");
  await expect(page.locator(".kpi-grid")).toContainText("2026-05");
  await expect(page.locator(".milestone-card")).toContainText("은퇴 목표");
  await expect(page.locator('svg[aria-label="연령별 월평균 수입 구성 및 순현금흐름 차트"]')).toBeVisible();
  await expect(page.locator('svg[aria-label="금융자산 잔액 추이 차트"]')).toBeVisible();

  // 시나리오 비교 탭 검증
  await page.getByRole("button", { name: "시나리오 비교" }).click();
  await expect(page.locator(".scenario-grid")).toContainText("보수적 스트레스");
  await expect(page.locator(".scenario-grid")).toContainText("기본 가정 (현재)");
  await expect(page.locator(".scenario-grid")).toContainText("낙관적 성장");

  // 월별 상세 테이블 탭 검증
  await page.getByRole("button", { name: "월별 상세 테이블" }).click();
  await page.getByRole("button", { name: "월별 전체" }).click();

  await expect(page.locator("#projection-table")).toContainText("2026-05");
  await expect(page.locator("#projection-body")).toContainText("근로소득");
  await expect(page.locator("#projection-body")).toContainText("국민연금");
  await expect(page.locator("#projection-body")).toContainText("배우자 국민연금");
  await expect(page.locator("#projection-body")).toContainText("건강보험료");
  await expect(page.locator("#projection-body")).toContainText("국민연금 납입");
  await expect(page.locator("#projection-body")).toContainText("생활비");
  await expect(page.locator("#projection-body")).toContainText("퇴직연금/IRP 월수령");
  await expect(page.locator("#projection-body")).toContainText("주택연금");
  await expect(page.locator("#projection-body")).toContainText("현금 잔액");
  await expect(page.locator("#projection-body")).toContainText("주식 잔액");
  await expect(page.locator("#projection-body")).toContainText("퇴직연금 잔액");
  await expect(page.locator("#projection-body")).toContainText("부동산 월수입 수입");
  await expect(page.locator("#projection-body")).toContainText("월 총수입(순수지)");

  const employmentRow = page.locator("#projection-body tr").filter({ hasText: /^수입근로소득/ });
  await expect(employmentRow).toContainText("6,100,000");
  await expect(page.locator("#projection-body tr.negative-cash")).toHaveCount(1);
  await expect(page.locator("#projection-body tr.negative-total")).toHaveCount(1);

  // 신뢰도 & 규칙 탭 검증
  await page.getByRole("button", { name: "신뢰도 & 규칙" }).click();
  await expect(page.locator(".reliability-grid")).toContainText("kr-nps-mvp-2026-04");
});

test("persists and restores last saved form values across reloads", async ({ page }) => {
  await page.goto("/");

  await page.locator('[name="retirement_age"]').fill("57");
  await page.locator('[name="monthly_living_expense"]').fill("4,200,000");

  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".saved-meta")).toContainText("마지막 저장:");

  await page.reload();

  await expect(page.locator('[name="retirement_age"]')).toHaveValue("57");
  await expect(page.locator('[name="monthly_living_expense"]')).toHaveValue("4,200,000");
});
