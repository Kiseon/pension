const { test, expect } = require("@playwright/test");

test("calculates a projection from form inputs", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("본인 생년월일").fill("1976-02-14");
  await page.getByLabel("배우자 생년월일").fill("1978-07-09");
  await page.getByLabel("분석 시작 월").fill("2026-05");
  await page.getByLabel("은퇴 목표 연령").fill("58");
  await page.getByLabel("퇴직 후 목표 월수입").fill("4,800,000");
  await page.getByLabel("현재 월 세후 근로소득").fill("6,100,000");
  await page.getByLabel("근로소득 연 상승률(%)").fill("2.5");
  await page.getByLabel("월 생활비").fill("3,000,000");
  await page.getByLabel("예상 퇴직금").fill("150,000,000");
  await page.getByLabel("희망퇴직위로금").fill("25,000,000");
  await page.getByLabel("퇴직금/위로금 수령 시작 연도").fill("2034");
  await page.getByLabel("퇴직금/위로금 수령 종료 연도").fill("2055");
  await page.getByLabel("월 임대/사업 수입").fill("1,600,000");
  await page.getByLabel("월 부동산 비용").fill("420,000");
  await page.getByLabel("부동산 수입 연 상승률(%)").fill("1.8");
  await page.getByLabel("본인 국민연금 정상 월수령액").fill("1,550,000");
  await page.getByLabel("본인 국민연금 선택 개시 연령").fill("65");
  await page.getByLabel("배우자 국민연금 정상 월수령액").fill("900,000");
  await page.getByLabel("배우자 국민연금 개시 연령").fill("65");
  await page.getByLabel("아파트 현재 시세").fill("700,000,000");
  await page.getByLabel("공동명의").check();
  await page.getByLabel("주택연금 개시 연령").fill("70");
  await page.getByLabel("본인 IRP 현재 잔액").fill("70,000,000");
  await page.getByLabel("본인 IRP 월 납입 계획").fill("600,000");
  await page.getByLabel("본인 IRP 수령 시작 연도").fill("2037");
  await page.getByLabel("본인 IRP 수령 종료 연도").fill("2056");
  await page.getByLabel("배우자 IRP 현재 잔액").fill("45,000,000");
  await page.getByLabel("배우자 IRP 월 납입 계획").fill("300,000");
  await page.getByLabel("배우자 IRP 수령 시작 연도").fill("2039");
  await page.getByLabel("배우자 IRP 수령 종료 연도").fill("2058");
  await page.getByLabel("IRP 연 예상수익률(%)").fill("4.2");
  await page.getByLabel("주식/투자 현재 잔액").fill("900,000,000");
  await page.getByLabel("주식/투자 연 예상수익률(%)").fill("5.5");
  await page.getByLabel("배당/이자 월수입").fill("250,000");
  await page.getByLabel("물가상승률(%)").fill("2.2");
  await page.getByLabel("퇴직 후 목표 월수입").blur();

  await expect(page.getByLabel("퇴직 후 목표 월수입")).toHaveValue("4,800,000");

  await page.getByRole("button", { name: "프로젝션 계산" }).click();

  await expect(page.locator("#summary")).toContainText("기간");
  await expect(page.locator("#summary")).toContainText("추천");
  await expect(page.locator("#summary")).toContainText("월 추가 저축 필요액");
  await expect(page.locator("#summary")).toContainText("4,800,000");

  await expect(page.locator("#projection-table")).toContainText("2026-05");
  await expect(page.locator("#projection-body")).toContainText("근로소득");
  await expect(page.locator("#projection-body")).toContainText("국민연금");
  await expect(page.locator("#projection-body")).toContainText("배우자 국민연금");
  await expect(page.locator("#projection-body")).toContainText("건강보험료");
  await expect(page.locator("#projection-body")).toContainText("국민연금 보험료");
  await expect(page.locator("#projection-body")).toContainText("생활비");
  await expect(page.locator("#projection-body")).toContainText("퇴직금/위로금 월수령");
  await expect(page.locator("#projection-body")).toContainText("주택연금");
  await expect(page.locator("#projection-body")).toContainText("주식잔고");
  await expect(page.locator("#projection-body")).toContainText("부동산 월수입 수입");
  await expect(page.locator("#projection-body")).toContainText("월 총수입");
  const employmentRow = page.locator("#projection-body tr").filter({ hasText: "근로소득" });
  await expect(employmentRow).toContainText("6,100,000");
  await expect(page.locator("#projection-body")).not.toContainText("원");
});
