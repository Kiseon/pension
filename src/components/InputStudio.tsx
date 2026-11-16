import React, { useRef, useState } from "react";
import { Briefcase, Building2, Calculator, Check, Download, Landmark, PiggyBank, RotateCcw, Save, Undo2, Upload, Users } from "lucide-react";
import type { ProjectionFormState } from "../types/projection";
import { INPUT_PRESETS } from "../utils/format";
import { formatSavedTimestamp, parseImportedFormJson } from "../utils/storage";
import { MoneyInput } from "./MoneyInput";

type InputTab = "household" | "employment" | "pension" | "assets";

interface InputStudioProps {
  form: ProjectionFormState;
  onChange: (updater: (prev: ProjectionFormState) => ProjectionFormState) => void;
  onSubmit: () => void;
  onSave: () => void;
  onRestoreSaved: () => void;
  onExportJson: () => void;
  onImportJson: (form: ProjectionFormState) => void;
  onReset: () => void;
  lastSavedAt: string | null;
  justSaved: boolean;
  loading: boolean;
  isDirty: boolean;
}

const TABS: Array<{ id: InputTab; label: string; icon: React.ReactNode }> = [
  { id: "household", label: "가구·은퇴", icon: <Users size={15} /> },
  { id: "employment", label: "근로·퇴직", icon: <Briefcase size={15} /> },
  { id: "pension", label: "연금·부동산", icon: <Landmark size={15} /> },
  { id: "assets", label: "IRP·투자", icon: <PiggyBank size={15} /> }
];

export const InputStudio: React.FC<InputStudioProps> = ({
  form,
  onChange,
  onSubmit,
  onSave,
  onRestoreSaved,
  onExportJson,
  onImportJson,
  onReset,
  lastSavedAt,
  justSaved,
  loading,
  isDirty
}) => {
  const [activeTab, setActiveTab] = useState<InputTab>("household");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseImportedFormJson(text);
      setImportError(null);
      onImportJson(imported);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "파일을 불러오지 못했습니다.");
    }
  };

  const setField = <K extends keyof ProjectionFormState>(
    key: K,
    value: ProjectionFormState[K]
  ) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumberChange =
    (key: keyof ProjectionFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value === "" ? 0 : Number(e.target.value);
      setField(key, (Number.isFinite(val) ? val : 0) as never);
    };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <aside className="input-studio">
      <div className="studio-header">
        <div>
          <span className="eyebrow">Input Studio</span>
          <h2>가구 재무 설계 입력</h2>
          {lastSavedAt && (
            <div className="saved-meta">
              마지막 저장: {formatSavedTimestamp(lastSavedAt)}
            </div>
          )}
        </div>
        <div className="studio-header-actions">
          <button
            type="button"
            className={`btn-ghost-sm ${justSaved ? "btn-saved" : ""}`}
            onClick={onSave}
            title="현재 입력값을 브라우저에 저장"
          >
            {justSaved ? <Check size={14} /> : <Save size={14} />}
            {justSaved ? "저장됨" : "저장"}
          </button>
          {lastSavedAt && (
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={onRestoreSaved}
              title="마지막으로 저장한 값 불러오기"
            >
              <Undo2 size={14} />
              불러오기
            </button>
          )}
          <button
            type="button"
            className="btn-ghost-sm"
            onClick={onReset}
            title="기본값으로 초기화"
          >
            <RotateCcw size={14} />
            초기화
          </button>
        </div>
      </div>

      <div className="preset-bar" aria-label="빠른 시나리오 프리셋">
        {INPUT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="preset-chip"
            title={preset.description}
            onClick={() =>
              onChange((prev) => ({ ...prev, ...preset.patch }))
            }
          >
            {preset.label}
          </button>
        ))}
      </div>

      <nav className="studio-tabs" aria-label="입력 섹션">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`studio-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <form id="projection-form" className="studio-form" onSubmit={handleFormSubmit}>
        <div className="studio-scroll">
          {activeTab === "household" && (
            <div className="form-section">
              <div className="section-title-row">
                <h3>가구 구성 및 은퇴 목표</h3>
                <span className="section-badge">100세까지 분석</span>
              </div>

              <div className="grid-2">
                <label className="field">
                  <span className="field-label">본인 생년월일</span>
                  <input
                    name="user_birth_date"
                    type="date"
                    value={form.userBirthDate}
                    onChange={(e) => setField("userBirthDate", e.target.value)}
                    required
                    className="input-control"
                  />
                </label>
                <label className="field">
                  <span className="field-label">배우자 생년월일 (선택)</span>
                  <input
                    name="spouse_birth_date"
                    type="date"
                    value={form.spouseBirthDate}
                    onChange={(e) => setField("spouseBirthDate", e.target.value)}
                    className="input-control"
                  />
                </label>
              </div>

              <div className="grid-2">
                <label className="field">
                  <span className="field-label">분석 시작 월</span>
                  <input
                    name="start_month"
                    type="month"
                    value={form.startMonth}
                    onChange={(e) => setField("startMonth", e.target.value)}
                    required
                    className="input-control"
                  />
                </label>
                <label className="field">
                  <span className="field-label">은퇴 목표 연령 (세)</span>
                  <input
                    name="retirement_age"
                    type="number"
                    min={40}
                    max={90}
                    value={form.retirementAge}
                    onChange={handleNumberChange("retirementAge")}
                    className="input-control tabular-nums"
                  />
                </label>
              </div>

              <MoneyInput
                name="monthly_living_expense"
                label="월 생활비 (현재가치 기준)"
                value={form.monthlyLivingExpense}
                onChange={(v) => setField("monthlyLivingExpense", v)}
                hint="물가상승률에 따라 매년 연동 증가합니다."
              />
            </div>
          )}

          {activeTab === "employment" && (
            <div className="form-section">
              <div className="section-title-row">
                <h3>재직 근로소득 및 퇴직 이벤트</h3>
              </div>

              <MoneyInput
                name="monthly_net_income"
                label="현재 월 세후 근로소득"
                value={form.monthlyNetIncome}
                onChange={(v) => setField("monthlyNetIncome", v)}
              />

              <MoneyInput
                name="monthly_gross_income_for_tax"
                label="세전 월 근로소득 (누진세 구간용, 선택)"
                value={form.monthlyGrossIncomeForTax}
                nullable
                onChange={(v) => setField("monthlyGrossIncomeForTax", v)}
                onNullableChange={(v) => setField("monthlyGrossIncomeForTax", v)}
                placeholder="미입력 시 세후 × 1.31 근사"
              />

              <label className="field">
                <span className="field-label">근로소득 연 상승률 (%)</span>
                <input
                  name="income_growth_rate"
                  type="number"
                  step={0.1}
                  value={form.incomeGrowthRate}
                  onChange={handleNumberChange("incomeGrowthRate")}
                  className="input-control tabular-nums"
                />
              </label>

              <div className="divider-label">퇴직금 · 희망퇴직위로금</div>

              <MoneyInput
                name="retirement_allowance"
                label="예상 퇴직금"
                value={form.retirementAllowance}
                onChange={(v) => setField("retirementAllowance", v)}
              />

              <MoneyInput
                name="voluntary_retirement_bonus"
                label="희망퇴직위로금"
                value={form.voluntaryRetirementBonus}
                onChange={(v) => setField("voluntaryRetirementBonus", v)}
              />

              <div className="grid-2">
                <label className="field">
                  <span className="field-label">수령 시작 연도</span>
                  <input
                    name="retirement_payout_start_year"
                    type="number"
                    min={2026}
                    max={2100}
                    value={form.retirementPayoutStartYear}
                    onChange={handleNumberChange("retirementPayoutStartYear")}
                    className="input-control tabular-nums"
                  />
                </label>
                <label className="field">
                  <span className="field-label">수령 종료 연도</span>
                  <input
                    name="retirement_payout_end_year"
                    type="number"
                    min={2026}
                    max={2100}
                    value={form.retirementPayoutEndYear}
                    onChange={handleNumberChange("retirementPayoutEndYear")}
                    className="input-control tabular-nums"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === "pension" && (
            <div className="form-section">
              <div className="section-title-row">
                <h3>국민연금 · 주택연금</h3>
              </div>

              <div className="paired-card">
                <div className="paired-card-title">국민연금 정상 월수령액</div>
                <div className="grid-2">
                  <MoneyInput
                    name="national_pension_amount"
                    label="본인"
                    value={form.nationalPensionAmount}
                    onChange={(v) => setField("nationalPensionAmount", v)}
                  />
                  <MoneyInput
                    name="spouse_national_pension_amount"
                    label="배우자"
                    value={form.spouseNationalPensionAmount}
                    onChange={(v) => setField("spouseNationalPensionAmount", v)}
                  />
                </div>
                <div className="grid-2">
                  <label className="field">
                    <span className="field-label">본인 개시 연령</span>
                    <input
                      name="national_pension_start_age"
                      type="number"
                      min={55}
                      max={75}
                      value={form.nationalPensionStartAge}
                      onChange={handleNumberChange("nationalPensionStartAge")}
                      className="input-control tabular-nums"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">배우자 개시 연령</span>
                    <input
                      name="spouse_national_pension_start_age"
                      type="number"
                      min={55}
                      max={75}
                      value={form.spouseNationalPensionStartAge}
                      onChange={handleNumberChange("spouseNationalPensionStartAge")}
                      className="input-control tabular-nums"
                    />
                  </label>
                </div>
              </div>

              <div className="paired-card">
                <div className="paired-card-title">주택연금</div>
                <MoneyInput
                  name="apartment_value"
                  label="아파트 현재 시세"
                  value={form.apartmentValue}
                  onChange={(v) => setField("apartmentValue", v)}
                />
                <div className="grid-2 align-center">
                  <label className="field">
                    <span className="field-label">주택연금 개시 연령</span>
                    <input
                      name="housing_pension_start_age"
                      type="number"
                      min={55}
                      max={95}
                      value={form.housingPensionStartAge}
                      onChange={handleNumberChange("housingPensionStartAge")}
                      className="input-control tabular-nums"
                    />
                  </label>
                  <label className="checkbox-card">
                    <input
                      name="joint_home_ownership"
                      type="checkbox"
                      checked={form.jointHomeOwnership}
                      onChange={(e) => setField("jointHomeOwnership", e.target.checked)}
                    />
                    <span>부부 공동명의</span>
                  </label>
                </div>
              </div>

              <div className="section-title-row">
                <h3>
                  <Building2 size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                  부동산 월수입
                </h3>
              </div>
              <MoneyInput
                name="real_estate_income"
                label="월 임대/사업 수입"
                value={form.realEstateIncome}
                onChange={(v) => setField("realEstateIncome", v)}
                hint="상가 등 단독명의 가정 · 한계세율 기반 비용 자동 차감"
              />
              <label className="field">
                <span className="field-label">부동산 수입 연 상승률 (%)</span>
                <input
                  name="real_estate_growth"
                  type="number"
                  step={0.1}
                  value={form.realEstateGrowth}
                  onChange={handleNumberChange("realEstateGrowth")}
                  className="input-control tabular-nums"
                />
              </label>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="form-section">
              <div className="section-title-row">
                <h3>IRP (개인형 퇴직연금)</h3>
              </div>

              <div className="paired-card">
                <div className="paired-card-title">IRP 현재 잔액 & 월 납입</div>
                <div className="grid-2">
                  <MoneyInput
                    name="irp_balance"
                    label="본인 잔액"
                    value={form.irpBalance}
                    onChange={(v) => setField("irpBalance", v)}
                  />
                  <MoneyInput
                    name="spouse_irp_balance"
                    label="배우자 잔액"
                    value={form.spouseIrpBalance}
                    onChange={(v) => setField("spouseIrpBalance", v)}
                  />
                </div>
                <div className="grid-2">
                  <MoneyInput
                    name="irp_contribution"
                    label="본인 월 납입"
                    value={form.irpContribution}
                    onChange={(v) => setField("irpContribution", v)}
                  />
                  <MoneyInput
                    name="spouse_irp_contribution"
                    label="배우자 월 납입"
                    value={form.spouseIrpContribution}
                    onChange={(v) => setField("spouseIrpContribution", v)}
                  />
                </div>
                <div className="grid-2">
                  <label className="field">
                    <span className="field-label">본인 수령 시작</span>
                    <input
                      name="irp_payout_start_year"
                      type="number"
                      min={2026}
                      max={2100}
                      value={form.irpPayoutStartYear}
                      onChange={handleNumberChange("irpPayoutStartYear")}
                      className="input-control tabular-nums"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">본인 수령 종료</span>
                    <input
                      name="irp_payout_end_year"
                      type="number"
                      min={2026}
                      max={2100}
                      value={form.irpPayoutEndYear}
                      onChange={handleNumberChange("irpPayoutEndYear")}
                      className="input-control tabular-nums"
                    />
                  </label>
                </div>
                <div className="grid-2">
                  <label className="field">
                    <span className="field-label">배우자 수령 시작</span>
                    <input
                      name="spouse_irp_payout_start_year"
                      type="number"
                      min={2026}
                      max={2100}
                      value={form.spouseIrpPayoutStartYear}
                      onChange={handleNumberChange("spouseIrpPayoutStartYear")}
                      className="input-control tabular-nums"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">배우자 수령 종료</span>
                    <input
                      name="spouse_irp_payout_end_year"
                      type="number"
                      min={2026}
                      max={2100}
                      value={form.spouseIrpPayoutEndYear}
                      onChange={handleNumberChange("spouseIrpPayoutEndYear")}
                      className="input-control tabular-nums"
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">IRP 연 예상수익률 (%)</span>
                  <input
                    name="irp_return"
                    type="number"
                    step={0.1}
                    value={form.irpReturn}
                    onChange={handleNumberChange("irpReturn")}
                    className="input-control tabular-nums"
                  />
                </label>
              </div>

              <div className="section-title-row">
                <h3>금융자산 & 물가 가정</h3>
              </div>

              <MoneyInput
                name="stock_balance"
                label="주식/투자 현재 잔액"
                value={form.stockBalance}
                onChange={(v) => setField("stockBalance", v)}
              />

              <div className="grid-2">
                <label className="field">
                  <span className="field-label">주식 연 수익률 (%)</span>
                  <input
                    name="stock_return"
                    type="number"
                    step={0.1}
                    value={form.stockReturn}
                    onChange={handleNumberChange("stockReturn")}
                    className="input-control tabular-nums"
                  />
                </label>
                <label className="field">
                  <span className="field-label">잉여현금 주식비율 (%)</span>
                  <input
                    name="stock_allocation_rate"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={form.stockAllocationRate}
                    onChange={handleNumberChange("stockAllocationRate")}
                    className="input-control tabular-nums"
                  />
                </label>
              </div>

              <MoneyInput
                name="monthly_financial_income"
                label="배당/이자 월수입"
                value={form.monthlyFinancialIncome}
                onChange={(v) => setField("monthlyFinancialIncome", v)}
              />

              <label className="field">
                <span className="field-label">물가상승률 (%)</span>
                <input
                  name="inflation_rate"
                  type="number"
                  step={0.1}
                  value={form.inflationRate}
                  onChange={handleNumberChange("inflationRate")}
                  className="input-control tabular-nums"
                />
              </label>
            </div>
          )}
        </div>

        <div className="studio-footer">
          {isDirty && (
            <div className="dirty-notice">
              입력값이 변경되었습니다. 버튼을 눌러 재계산하세요.
            </div>
          )}
          {importError && <div className="dirty-notice text-danger">{importError}</div>}
          <button type="submit" className="btn-primary-full" disabled={loading}>
            <Calculator size={16} />
            {loading ? "프로젝션 계산 중..." : "프로젝션 계산 (자동 저장)"}
          </button>
          <div className="footer-io-row">
            <button type="button" className="btn-ghost-sm" onClick={onExportJson}>
              <Download size={13} />
              JSON 백업
            </button>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} />
              JSON 불러오기
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      </form>
    </aside>
  );
};
