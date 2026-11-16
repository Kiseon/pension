import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, GitCompare, ShieldCheck, Table2 } from "lucide-react";
import { runProjection } from "./api/projectionClient";
import { AssetBalanceChart } from "./components/AssetBalanceChart";
import { BreakdownTable } from "./components/BreakdownTable";
import { CashflowChart } from "./components/CashflowChart";
import { InputStudio } from "./components/InputStudio";
import { KpiStrip } from "./components/KpiStrip";
import { MilestoneTimeline } from "./components/MilestoneTimeline";
import { ReliabilityPanel } from "./components/ReliabilityPanel";
import { ScenarioComparison } from "./components/ScenarioComparison";
import type {
  ProjectionFormState,
  ProjectionResponse,
  ResultTab,
  ValuationMode
} from "./types/projection";
import { buildPayload, DEFAULT_FORM_STATE } from "./utils/format";
import { loadSavedForm, saveFormSnapshot, exportFormJson } from "./utils/storage";

const RESULT_TABS: Array<{ id: ResultTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "개요 & 차트", icon: <BarChart3 size={15} /> },
  { id: "scenarios", label: "시나리오 비교", icon: <GitCompare size={15} /> },
  { id: "table", label: "월별 상세 테이블", icon: <Table2 size={15} /> },
  { id: "reliability", label: "신뢰도 & 규칙", icon: <ShieldCheck size={15} /> }
];

export const App: React.FC = () => {
  const [initialSnapshot] = useState(() => loadSavedForm());
  const [form, setForm] = useState<ProjectionFormState>(
    () => initialSnapshot?.form ?? DEFAULT_FORM_STATE
  );
  const [appliedForm, setAppliedForm] = useState<ProjectionFormState>(
    () => initialSnapshot?.form ?? DEFAULT_FORM_STATE
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    () => initialSnapshot?.savedAt ?? null
  );
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [result, setResult] = useState<ProjectionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [valuationMode, setValuationMode] = useState<ValuationMode>("nominal");
  const [resultTab, setResultTab] = useState<ResultTab>("overview");

  const executeProjection = useCallback(
    async (targetForm: ProjectionFormState, saveOnSuccess = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await runProjection(buildPayload(targetForm));
        setResult(data);
        setAppliedForm(targetForm);
        setIsDirty(false);
        if (saveOnSuccess) {
          const snapshot = saveFormSnapshot(targetForm);
          setLastSavedAt(snapshot.savedAt);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "프로젝션 계산 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void executeProjection(initialSnapshot?.form ?? DEFAULT_FORM_STATE, false);
  }, [executeProjection, initialSnapshot]);

  const handleFormChange = (
    updater: (prev: ProjectionFormState) => ProjectionFormState
  ) => {
    setForm((prev) => updater(prev));
    setIsDirty(true);
    setJustSaved(false);
  };

  const handleSave = () => {
    const snapshot = saveFormSnapshot(form);
    setLastSavedAt(snapshot.savedAt);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  const handleRestoreSaved = () => {
    const snapshot = loadSavedForm();
    if (!snapshot) return;
    setForm(snapshot.form);
    setLastSavedAt(snapshot.savedAt);
    void executeProjection(snapshot.form, false);
  };

  const handleImportForm = (imported: ProjectionFormState) => {
    setForm(imported);
    const snapshot = saveFormSnapshot(imported);
    setLastSavedAt(snapshot.savedAt);
    void executeProjection(imported, false);
  };

  const handleExportForm = () => {
    exportFormJson(form);
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM_STATE);
    void executeProjection(DEFAULT_FORM_STATE, false);
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="eyebrow">KOREA RETIREMENT INCOME PLANNER</span>
            <h1>노후 월수입 프로젝션</h1>
            <p className="brand-sub">
              근로소득 · 퇴직금 · 국민/주택연금 · IRP · 금융자산을 통합해 100세까지 세후 월 현금흐름을 설계합니다.
            </p>
          </div>

          <div className="topbar-controls">
            <div className="valuation-toggle" role="group" aria-label="금액 표시 기준">
              <button
                type="button"
                className={valuationMode === "nominal" ? "active" : ""}
                onClick={() => setValuationMode("nominal")}
              >
                명목금액
              </button>
              <button
                type="button"
                className={valuationMode === "real" ? "active" : ""}
                onClick={() => setValuationMode("real")}
              >
                실질금액 (물가반영)
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="workspace">
        <InputStudio
          form={form}
          onChange={handleFormChange}
          onSubmit={() => void executeProjection(form, true)}
          onSave={handleSave}
          onRestoreSaved={handleRestoreSaved}
          onExportJson={handleExportForm}
          onImportJson={handleImportForm}
          onReset={handleReset}
          lastSavedAt={lastSavedAt}
          justSaved={justSaved}
          loading={loading}
          isDirty={isDirty}
        />

        <section className="dashboard-canvas" aria-live="polite">
          {error && (
            <div className="error-banner" role="alert">
              <strong>계산 실패:</strong> {error}
            </div>
          )}

          {!result && loading && (
            <div className="loading-panel">프로젝션을 계산하고 있습니다...</div>
          )}

          {result && (
            <>
              <KpiStrip
                data={result}
                retirementAge={appliedForm.retirementAge}
                valuationMode={valuationMode}
              />

              <div className="result-nav-bar">
                <nav className="result-tabs" aria-label="분석 뷰">
                  {RESULT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`result-tab ${resultTab === tab.id ? "active" : ""}`}
                      onClick={() => setResultTab(tab.id)}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {resultTab === "overview" && (
                <div className="overview-stack">
                  <MilestoneTimeline data={result} form={appliedForm} />
                  <CashflowChart
                    monthly={result.monthly}
                    form={appliedForm}
                    valuationMode={valuationMode}
                  />
                  <AssetBalanceChart monthly={result.monthly} />
                </div>
              )}

              {resultTab === "scenarios" && (
                <ScenarioComparison
                  form={appliedForm}
                  baseResponse={result}
                  valuationMode={valuationMode}
                />
              )}

              {resultTab === "table" && (
                <BreakdownTable
                  monthly={result.monthly}
                  retirementAge={appliedForm.retirementAge}
                />
              )}

              {resultTab === "reliability" && <ReliabilityPanel data={result} />}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
