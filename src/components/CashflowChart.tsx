import React, { useMemo, useState } from "react";
import type { MonthlyProjectionRow, ProjectionFormState, ValuationMode } from "../types/projection";
import { formatCompactKrw, formatKrw } from "../utils/format";

interface CashflowChartProps {
  monthly: MonthlyProjectionRow[];
  form: ProjectionFormState;
  valuationMode: ValuationMode;
}

interface YearlyPoint {
  year: number;
  age: number;
  employment: number;
  pension: number;
  realEstate: number;
  retirementOther: number;
  expense: number; // positive magnitude for display
  netCashflow: number;
}

const SERIES = [
  { key: "employment" as const, label: "근로소득", color: "#2563eb" },
  { key: "pension" as const, label: "국민·주택연금", color: "#059669" },
  { key: "realEstate" as const, label: "부동산 수입", color: "#d97706" },
  { key: "retirementOther" as const, label: "퇴직·IRP·금융", color: "#7c3aed" }
];

export const CashflowChart: React.FC<CashflowChartProps> = ({
  monthly,
  form,
  valuationMode
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const yearlyData = useMemo<YearlyPoint[]>(() => {
    const byYear = new Map<number, MonthlyProjectionRow[]>();
    for (const row of monthly) {
      const yr = Number(row.month.slice(0, 4));
      const list = byYear.get(yr);
      if (list) list.push(row);
      else byYear.set(yr, [row]);
    }

    const result: YearlyPoint[] = [];
    for (const [year, rows] of Array.from(byYear.entries()).sort((a, b) => a[0] - b[0])) {
      let employment = 0;
      let pension = 0;
      let realEstate = 0;
      let retirementOther = 0;
      let expense = 0;
      let netCashflow = 0;

      for (const r of rows) {
        const factor =
          valuationMode === "real" && r.nominal_total !== 0
            ? r.real_total / r.nominal_total
            : 1;

        for (const line of r.lines) {
          const amt = line.amount * factor;
          if (amt < 0) {
            expense += Math.abs(amt);
          } else if (line.category === "employment") {
            employment += amt;
          } else if (
            line.category === "national_pension" ||
            line.category === "housing_pension"
          ) {
            pension += amt;
          } else if (line.category === "real_estate") {
            realEstate += amt;
          } else {
            retirementOther += amt;
          }
        }
        netCashflow += valuationMode === "real" ? r.real_total : r.nominal_total;
      }

      const count = rows.length || 1;
      result.push({
        year,
        age: rows[0].user_age,
        employment: employment / count,
        pension: pension / count,
        realEstate: realEstate / count,
        retirementOther: retirementOther / count,
        expense: expense / count,
        netCashflow: netCashflow / count
      });
    }
    return result;
  }, [monthly, valuationMode]);

  if (yearlyData.length === 0) return null;

  const width = 760;
  const height = 290;
  const pad = { top: 24, right: 20, bottom: 38, left: 66 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxIncome = Math.max(
    ...yearlyData.map(
      (d) => d.employment + d.pension + d.realEstate + d.retirementOther
    ),
    1_000_000
  );
  const minNet = Math.min(...yearlyData.map((d) => d.netCashflow), 0);
  const yMax = Math.ceil(maxIncome / 1_000_000) * 1_000_000;
  const yMin = minNet < 0 ? Math.floor(minNet / 1_000_000) * 1_000_000 : 0;
  const ySpan = Math.max(yMax - yMin, 1);

  const yToPx = (val: number) =>
    pad.top + ((yMax - val) / ySpan) * plotH;
  const zeroY = yToPx(0);

  const barStep = plotW / yearlyData.length;
  const barW = Math.max(Math.min(barStep * 0.68, 18), 3);

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    yMin + ((yMax - yMin) * i) / yTicks
  );

  const netPath = yearlyData
    .map((d, i) => {
      const x = pad.left + i * barStep + barStep / 2;
      const y = yToPx(d.netCashflow);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const retireIdx = yearlyData.findIndex((d) => d.age >= form.retirementAge);
  const npsIdx = yearlyData.findIndex((d) => d.age >= form.nationalPensionStartAge);

  const activePoint = hoveredIdx !== null ? yearlyData[hoveredIdx] : null;

  return (
    <div className="chart-card">
      <div className="card-header-inline">
        <div>
          <h3>연령별 월평균 수입 구성 & 순현금흐름</h3>
          <span className="card-subtitle">
            {valuationMode === "real" ? "물가반영 실질가치" : "명목금액"} · 마우스를 올리면 연도별 상세 내역을 확인할 수 있습니다
          </span>
        </div>
        <div className="chart-legend">
          {SERIES.map((s) => (
            <span key={s.key} className="legend-item">
              <span className="legend-swatch" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
          <span className="legend-item">
            <span className="legend-line" />
            순수지(세후)
          </span>
        </div>
      </div>

      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="chart-svg"
          role="img"
          aria-label="연령별 월평균 수입 구성 및 순현금흐름 차트"
        >
          {tickValues.map((val, idx) => {
            const y = yToPx(val);
            return (
              <g key={idx}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke={Math.abs(val) < 1 ? "#94a3b8" : "#e2e8f0"}
                  strokeDasharray={Math.abs(val) < 1 ? undefined : "3 3"}
                />
                <text
                  x={pad.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="axis-label"
                >
                  {formatCompactKrw(val).replace("원", "")}
                </text>
              </g>
            );
          })}

          {retireIdx >= 0 && (
            <g>
              <line
                x1={pad.left + retireIdx * barStep + barStep / 2}
                x2={pad.left + retireIdx * barStep + barStep / 2}
                y1={pad.top}
                y2={height - pad.bottom}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
              <text
                x={pad.left + retireIdx * barStep + barStep / 2 + 4}
                y={pad.top + 10}
                className="milestone-svg-label"
                fill="#b45309"
              >
                은퇴({form.retirementAge}세)
              </text>
            </g>
          )}

          {npsIdx >= 0 && npsIdx !== retireIdx && (
            <g>
              <line
                x1={pad.left + npsIdx * barStep + barStep / 2}
                x2={pad.left + npsIdx * barStep + barStep / 2}
                y1={pad.top}
                y2={height - pad.bottom}
                stroke="#10b981"
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
              <text
                x={pad.left + npsIdx * barStep + barStep / 2 + 4}
                y={pad.top + 22}
                className="milestone-svg-label"
                fill="#047857"
              >
                국민연금({form.nationalPensionStartAge}세)
              </text>
            </g>
          )}

          {yearlyData.map((d, i) => {
            const cx = pad.left + i * barStep + barStep / 2;
            const x = cx - barW / 2;
            let runningTop = 0;

            return (
              <g key={d.year}>
                {SERIES.map((s) => {
                  const val = d[s.key];
                  if (val <= 0) return null;
                  const yBottom = yToPx(runningTop);
                  const yTop = yToPx(runningTop + val);
                  runningTop += val;
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={yTop}
                      width={barW}
                      height={Math.max(yBottom - yTop, 0.5)}
                      fill={s.color}
                      opacity={hoveredIdx === null || hoveredIdx === i ? 0.88 : 0.35}
                      rx={1}
                    />
                  );
                })}

                {i % Math.max(Math.ceil(yearlyData.length / 8), 1) === 0 && (
                  <text
                    x={cx}
                    y={height - 14}
                    textAnchor="middle"
                    className="axis-label"
                  >
                    {d.age}세 ({String(d.year).slice(2)})
                  </text>
                )}

                <rect
                  x={pad.left + i * barStep}
                  y={pad.top}
                  width={barStep}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}

          <path
            d={netPath}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {hoveredIdx !== null && (
            <line
              x1={pad.left + hoveredIdx * barStep + barStep / 2}
              x2={pad.left + hoveredIdx * barStep + barStep / 2}
              y1={pad.top}
              y2={zeroY}
              stroke="#0f172a"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {activePoint && (
          <div className="chart-tooltip">
            <div className="tooltip-title">
              {activePoint.year}년 (본인 {activePoint.age}세)
            </div>
            <div className="tooltip-row">
              <span>근로소득</span>
              <strong className="tabular-nums">{formatKrw(activePoint.employment)}원</strong>
            </div>
            <div className="tooltip-row">
              <span>국민·주택연금</span>
              <strong className="tabular-nums">{formatKrw(activePoint.pension)}원</strong>
            </div>
            <div className="tooltip-row">
              <span>부동산 수입</span>
              <strong className="tabular-nums">{formatKrw(activePoint.realEstate)}원</strong>
            </div>
            <div className="tooltip-row">
              <span>퇴직·IRP·금융</span>
              <strong className="tabular-nums">{formatKrw(activePoint.retirementOther)}원</strong>
            </div>
            <div className="tooltip-row">
              <span>월 지출(생활비·세금)</span>
              <strong className="tabular-nums text-danger">-{formatKrw(activePoint.expense)}원</strong>
            </div>
            <div className="tooltip-divider" />
            <div className="tooltip-row">
              <span>월 순수지</span>
              <strong className={`tabular-nums ${activePoint.netCashflow < 0 ? "text-danger" : "text-success"}`}>
                {activePoint.netCashflow >= 0 ? "+" : ""}
                {formatKrw(activePoint.netCashflow)}원
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
