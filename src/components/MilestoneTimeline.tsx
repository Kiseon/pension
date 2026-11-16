import React from "react";
import type { ProjectionFormState, ProjectionResponse } from "../types/projection";
import { formatCompactKrw } from "../utils/format";

interface MilestoneTimelineProps {
  data: ProjectionResponse;
  form: ProjectionFormState;
}

interface MilestoneItem {
  age: number;
  year: string;
  label: string;
  detail: string;
  tone: "neutral" | "accent" | "warning" | "danger";
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ data, form }) => {
  const { monthly, recommendation } = data;
  if (monthly.length === 0) return null;

  const first = monthly[0];
  const last = monthly[monthly.length - 1];
  const retireRow = monthly.find((r) => r.user_age >= form.retirementAge);
  const npsRow = monthly.find((r) => r.user_age >= form.nationalPensionStartAge);
  const housingRow = monthly.find((r) => r.user_age >= form.housingPensionStartAge);
  const depletionRow = recommendation.depletion_month
    ? monthly.find((r) => r.month === recommendation.depletion_month)
    : null;

  const milestones: MilestoneItem[] = [
    {
      age: first.user_age,
      year: first.month.slice(0, 4),
      label: "분석 시작",
      detail: `금융자산 ${formatCompactKrw(first.remaining_financial_assets)}`,
      tone: "neutral"
    }
  ];

  if (retireRow && retireRow.user_age !== first.user_age) {
    milestones.push({
      age: retireRow.user_age,
      year: retireRow.month.slice(0, 4),
      label: "은퇴 목표",
      detail: `잔여자산 ${formatCompactKrw(retireRow.remaining_financial_assets)}`,
      tone: "accent"
    });
  }

  if (npsRow && form.nationalPensionAmount > 0) {
    milestones.push({
      age: npsRow.user_age,
      year: npsRow.month.slice(0, 4),
      label: "국민연금 개시",
      detail: `월 ${formatCompactKrw(form.nationalPensionAmount)}`,
      tone: "accent"
    });
  }

  if (housingRow && form.apartmentValue > 0) {
    milestones.push({
      age: housingRow.user_age,
      year: housingRow.month.slice(0, 4),
      label: "주택연금 개시",
      detail: `시세 ${formatCompactKrw(form.apartmentValue)}`,
      tone: "neutral"
    });
  }

  if (depletionRow) {
    milestones.push({
      age: depletionRow.user_age,
      year: depletionRow.month.slice(0, 4),
      label: "자산 소진",
      detail: depletionRow.month,
      tone: "danger"
    });
  }

  milestones.push({
    age: last.user_age,
    year: last.month.slice(0, 4),
    label: "100세 종료",
    detail: `잔여자산 ${formatCompactKrw(last.remaining_financial_assets)}`,
    tone: last.remaining_financial_assets >= 0 ? "neutral" : "warning"
  });

  milestones.sort((a, b) => a.age - b.age);

  return (
    <div className="milestone-card">
      <div className="card-header-inline">
        <h3>생애 주요 마일스톤</h3>
        <span className="card-subtitle">본인 연령 기준 주요 현금흐름 전환점</span>
      </div>
      <div className="milestone-track">
        {milestones.map((m, idx) => (
          <div key={`${m.label}-${idx}`} className={`milestone-node tone-${m.tone}`}>
            <div className="milestone-age tabular-nums">{m.age}세</div>
            <div className="milestone-dot" />
            <div className="milestone-year tabular-nums">{m.year}년</div>
            <div className="milestone-label">{m.label}</div>
            <div className="milestone-detail tabular-nums">{m.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
