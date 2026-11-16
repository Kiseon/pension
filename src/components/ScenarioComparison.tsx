import React, { useEffect, useState } from "react";
import { RefreshCw, ShieldAlert, Sparkles, Target } from "lucide-react";
import { runProjection } from "../api/projectionClient";
import type { ProjectionFormState, ScenarioComparisonItem, ValuationMode } from "../types/projection";
import { buildPayload, formatCompactKrw, formatKrw } from "../utils/format";

interface ScenarioComparisonProps {
  form: ProjectionFormState;
  baseResponse: ScenarioComparisonItem["response"];
  valuationMode: ValuationMode;
}

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  form,
  baseResponse,
  valuationMode
}) => {
  const [items, setItems] = useState<ScenarioComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadScenarios = async () => {
    setLoading(true);
    const specs: Array<Omit<ScenarioComparisonItem, "response">> = [
      {
        id: "conservative",
        label: "보수적 스트레스",
        description: "물가상승률 +1.0%p · 투자/IRP 수익률 -1.5%p",
        inflationDelta: 1.0,
        returnDelta: -1.5
      },
      {
        id: "base",
        label: "기본 가정 (현재)",
        description: `물가 ${form.inflationRate}% · 주식 ${form.stockReturn}% · IRP ${form.irpReturn}%`,
        inflationDelta: 0,
        returnDelta: 0
      },
      {
        id: "optimistic",
        label: "낙관적 성장",
        description: "물가상승률 -0.5%p · 투자/IRP 수익률 +1.5%p",
        inflationDelta: -0.5,
        returnDelta: 1.5
      }
    ];

    const results = await Promise.all(
      specs.map(async (spec) => {
        if (spec.id === "base" && baseResponse) {
          return { ...spec, response: baseResponse };
        }
        try {
          const variantForm: ProjectionFormState = {
            ...form,
            inflationRate: Math.max(0, form.inflationRate + spec.inflationDelta),
            stockReturn: Math.max(0, form.stockReturn + spec.returnDelta),
            irpReturn: Math.max(0, form.irpReturn + spec.returnDelta)
          };
          const response = await runProjection(buildPayload(variantForm));
          return { ...spec, response };
        } catch (err) {
          return {
            ...spec,
            response: null,
            error: err instanceof Error ? err.message : "시나리오 계산 실패"
          };
        }
      })
    );

    setItems(results);
    setLoading(false);
  };

  useEffect(() => {
    void loadScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseResponse]);

  const iconFor = (id: ScenarioComparisonItem["id"]) => {
    if (id === "conservative") return <ShieldAlert size={16} className="text-warning" />;
    if (id === "optimistic") return <Sparkles size={16} className="text-success" />;
    return <Target size={16} className="text-primary" />;
  };

  return (
    <div className="scenario-panel">
      <div className="card-header-inline">
        <div>
          <h3>시나리오 스트레스 비교</h3>
          <span className="card-subtitle">
            물가상승률과 투자수익률 변동에 따른 은퇴 후 지속가능성을 비교합니다
          </span>
        </div>
        <button
          type="button"
          className="btn-ghost-sm"
          onClick={() => void loadScenarios()}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          다시 비교
        </button>
      </div>

      <div className="scenario-grid">
        {items.map((item) => {
          const res = item.response;
          const monthly = res?.monthly ?? [];
          const last = monthly[monthly.length - 1];
          const retireRows = monthly.filter((r) => r.user_age >= form.retirementAge);
          const avgPostRetireNet =
            retireRows.length > 0
              ? retireRows.reduce(
                  (acc, r) =>
                    acc + (valuationMode === "real" ? r.real_total : r.nominal_total),
                  0
                ) / retireRows.length
              : 0;

          return (
            <div key={item.id} className={`scenario-card scenario-${item.id}`}>
              <div className="scenario-card-head">
                <div className="scenario-title">
                  {iconFor(item.id)}
                  <h4>{item.label}</h4>
                </div>
                <p className="scenario-desc">{item.description}</p>
              </div>

              {item.error && <div className="error-box">{item.error}</div>}
              {!res && !item.error && <div className="muted-box">계산 중...</div>}

              {res && (
                <dl className="scenario-metrics">
                  <div>
                    <dt>자산 소진 시점</dt>
                    <dd className={res.recommendation.depletion_month ? "text-danger" : "text-success"}>
                      {res.recommendation.depletion_month ?? "100세까지 유지"}
                    </dd>
                  </div>
                  <div>
                    <dt>은퇴 시점 추가 필요액</dt>
                    <dd className="tabular-nums">
                      {res.recommendation.additional_savings_needed_at_retirement > 0
                        ? formatCompactKrw(
                            res.recommendation.additional_savings_needed_at_retirement
                          )
                        : "없음"}
                    </dd>
                  </div>
                  <div>
                    <dt>은퇴 후 월평균 수지</dt>
                    <dd
                      className={`tabular-nums ${
                        avgPostRetireNet < 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {avgPostRetireNet >= 0 ? "+" : ""}
                      {formatKrw(avgPostRetireNet)}원
                    </dd>
                  </div>
                  <div>
                    <dt>100세 시점 잔여자산</dt>
                    <dd className="tabular-nums">
                      {formatCompactKrw(last?.remaining_financial_assets ?? 0)}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
