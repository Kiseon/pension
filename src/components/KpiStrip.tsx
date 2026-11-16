import React from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import type { ProjectionResponse, ValuationMode } from "../types/projection";
import { formatCompactKrw, formatKrw } from "../utils/format";

interface KpiStripProps {
  data: ProjectionResponse;
  retirementAge: number;
  valuationMode: ValuationMode;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  data,
  retirementAge,
  valuationMode
}) => {
  const { monthly, recommendation, confidence_score, projection_start, projection_end } = data;
  const retirementRow = monthly.find((r) => r.user_age >= retirementAge) ?? monthly[0];
  const age65Row = monthly.find((r) => r.user_age >= 65) ?? monthly[monthly.length - 1];
  const lastRow = monthly[monthly.length - 1];

  const getNet = (row: typeof retirementRow) =>
    valuationMode === "real" ? row.real_total : row.nominal_total;

  const retirementNet = retirementRow ? getNet(retirementRow) : 0;
  const age65Net = age65Row ? getNet(age65Row) : 0;

  const depletionRow = recommendation.depletion_month
    ? monthly.find((r) => r.month === recommendation.depletion_month)
    : null;

  const isHealthy =
    !recommendation.depletion_month &&
    recommendation.additional_savings_needed_at_retirement === 0;

  return (
    <div className="kpi-section">
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">
              은퇴 시점({retirementAge}세) 월 수지
            </span>
            <Wallet size={16} className="kpi-icon muted-icon" />
          </div>
          <div className={`kpi-value tabular-nums ${retirementNet < 0 ? "text-danger" : "text-primary"}`}>
            {retirementNet >= 0 ? "+" : ""}
            {formatCompactKrw(retirementNet)}
          </div>
          <div className="kpi-sub tabular-nums">
            65세 시점: {age65Net >= 0 ? "+" : ""}
            {formatKrw(age65Net)}원 · {valuationMode === "real" ? "실질가치" : "명목금액"}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">은퇴 시점 추가 필요액</span>
            <TrendingUp size={16} className="kpi-icon muted-icon" />
          </div>
          <div
            className={`kpi-value tabular-nums ${
              recommendation.additional_savings_needed_at_retirement > 0
                ? "text-warning"
                : "text-success"
            }`}
          >
            {recommendation.additional_savings_needed_at_retirement > 0
              ? formatCompactKrw(recommendation.additional_savings_needed_at_retirement)
              : "추가 저축 불필요"}
          </div>
          <div className="kpi-sub tabular-nums">
            {recommendation.additional_savings_needed_at_retirement > 0
              ? `${formatKrw(recommendation.additional_savings_needed_at_retirement)}원 추가 확보 권장`
              : `100세 시점 잔여자산 ${formatCompactKrw(lastRow?.remaining_financial_assets ?? 0)}`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">자산 소진 예상 시점</span>
            <Clock size={16} className="kpi-icon muted-icon" />
          </div>
          <div
            className={`kpi-value tabular-nums ${
              recommendation.depletion_month ? "text-danger" : "text-success"
            }`}
          >
            {recommendation.depletion_month
              ? `${recommendation.depletion_month}`
              : "100세까지 유지"}
          </div>
          <div className="kpi-sub">
            {depletionRow
              ? `본인 ${depletionRow.user_age}세 시점 현금/금융자산 소진`
              : "분석 기간 내 현금 및 금융자산 양수 유지"}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">입력 신뢰도 · 분석 기간</span>
            <ShieldCheck size={16} className="kpi-icon muted-icon" />
          </div>
          <div className="kpi-value tabular-nums">{confidence_score}점 / 100</div>
          <div className="kpi-sub tabular-nums">
            {projection_start} ~ {projection_end} ({monthly.length}개월)
          </div>
        </div>
      </div>

      <div className={`recommendation-banner ${isHealthy ? "banner-ok" : "banner-warn"}`}>
        <div className="banner-icon">
          {isHealthy ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="banner-body">
          <span className="banner-tag">{isHealthy ? "안정 진단" : "주의 · 추천"}</span>
          <p>{recommendation.summary}</p>
        </div>
      </div>
    </div>
  );
};
