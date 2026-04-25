const { test, expect } = require("@playwright/test");

test("calculates a projection from form inputs", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("본인 생년월일").fill("1976-02-14");
  await page.getByLabel("배우자 생년월일").fill("1978-07-09");
  await page.getByLabel("분석 시작 월").fill("2026-05");
  await page.getByLabel("은퇴 목표 연령").fill("61");
  await page.getByLabel("퇴직 후 목표 월수입").fill("4800000");
  await page.getByLabel("현재 월 세후 근로소득").fill("6100000");
  await page.getByLabel("근로소득 연 상승률(%)").fill("2.5");
  await page.getByLabel("예상 퇴직금").fill("150000000");
  await page.getByLabel("희망퇴직위로금").fill("25000000");
  await page.getByLabel("월 임대/사업 수입").fill("1600000");
  await page.getByLabel("월 부동산 비용").fill("420000");
  await page.getByLabel("부동산 수입 연 상승률(%)").fill("1.8");
  await page.getByLabel("국민연금 정상 월수령액").fill("1550000");
  await page.getByLabel("국민연금 선택 개시 연령").fill("65");
  await page.getByLabel("주택연금 월수령액").fill("850000");
  await page.getByLabel("주택연금 개시 연령").fill("70");
  await page.getByLabel("IRP 현재 잔액").fill("70000000");
  await page.getByLabel("IRP 월 납입 계획").fill("600000");
  await page.getByLabel("IRP 연 예상수익률(%)").fill("4.2");
  await page.getByLabel("주식/투자 현재 잔액").fill("110000000");
  await page.getByLabel("주식/투자 연 예상수익률(%)").fill("5.5");
  await page.getByLabel("배당/이자 월수입").fill("250000");
  await page.getByLabel("물가상승률(%)").fill("2.2");

  await page.getByRole("button", { name: "프로젝션 계산" }).click();

  await expect(page.locator("#summary")).toContainText("기간");
  await expect(page.locator("#summary")).toContainText("추천");
  await expect(page.locator("#summary")).toContainText("월 추가 저축 필요액");

  const firstRow = page.locator("#monthly-rows tr").first();
  await expect(firstRow).toContainText("2026-05");
  await expect(firstRow).toContainText("원");
  await expect(page.locator("#monthly-rows tr")).toHaveCount(240);
});
