import React, { useMemo, useState } from "react";
import type { MonthlyProjectionRow } from "../types/projection";
import { formatCompactKrw, formatKrw } from "../utils/format";

interface AssetBalanceChartProps {
  monthly: MonthlyProjectionRow[];
}

interface YearlyBalancePoint {
  year: number;
  age: number;
  cash: number;
  stock: number;
  retirement: number;
  total: number;
}

export const AssetBalanceChart: React.FC<AssetBalanceChartProps> = ({ monthly }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const yearlyBalances = useMemo<YearlyBalancePoint[]>(() => {
    const byYear = new Map<number, MonthlyProjectionRow>();
    for (const row of monthly) {
      const yr = Number(row.month.slice(0, 4));
      byYear.set(yr, row); // end-of-year balance
    }
    return Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, r]) => ({
        year,
        age: r.user_age,
        cash: r.cash_balance,
        stock: r.stock_balance,
        retirement: r.retirement_balance,
        total: r.remaining_financial_assets
      }));
  }, [monthly]);

  if (yearlyBalances.length === 0) return null;

  const width = 760;
  const height = 240;
  const pad = { top: 20, right: 20, bottom: 36, left: 66 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVal = Math.max(
    ...yearlyBalances.map((d) => Math.max(d.total, d.cash, d.stock, d.retirement)),
    10_000_000
  );
  const minVal = Math.min(...yearlyBalances.map((d) => Math.min(d.total, d.cash)), 0);
  const yMax = Math.ceil(maxVal / 10_000_000) * 10_000_000;
  const yMin = minVal < 0 ? Math.floor(minVal / 10_000_000) * 10_000_000 : 0;
  const ySpan = Math.max(yMax - yMin, 1);

  const xAt = (i: number) =>
    pad.left +
    (yearlyBalances.length === 1
      ? plotW / 2
      : (i / (yearlyBalances.length - 1)) * plotW);
  const yAt = (v: number) => pad.top + ((yMax - v) / ySpan) * plotH;

  const buildLine = (pick: (d: YearlyBalancePoint) => number) =>
    yearlyBalances
      .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(pick(d)).toFixed(1)}`)
      .join(" ");

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    yMin + ((yMax - yMin) * i) / ticks
  );

  const active = hoveredIdx !== null ? yearlyBalances[hoveredIdx] : null;
  const stepW = plotW / Math.max(yearlyBalances.length, 1);

  return (
    <div className="chart-card">
      <div className="card-header-inline">
        <div>
          <h3>금융자산 잔액 추이 (연말 기준)</h3>
          <span className="card-subtitle">현금 · 주식 · 퇴직연금(IRP) 잔액 변화</span>
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: "#0f172a" }} />
            총 잔여자산
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: "#2563eb" }} />
            주식 잔액
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: "#7c3aed" }} />
            퇴직연금/IRP
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: "#059669" }} />
            현금 잔액
          </span>
        </div>
      </div>

      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="chart-svg"
          role="img"
          aria-label="금융자산 잔액 추이 차트"
        >
          {tickValues.map((val, idx) => {
            const y = yAt(val);
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
                <text x={pad.left - 8} y={y + 4} textAnchor="end" className="axis-label">
                  {formatCompactKrw(val).replace("원", "")}
                </text>
              </g>
            );
          })}

          <path d={buildLine((d) => d.cash)} fill="none" stroke="#059669" strokeWidth={1.8} />
          <path d={buildLine((d) => d.stock)} fill="none" stroke="#2563eb" strokeWidth={1.8} />
          <path d={buildLine((d) => d.retirement)} fill="none" stroke="#7c3aed" strokeWidth={1.8} />
          <path d={buildLine((d) => d.total)} fill="none" stroke="#0f172a" strokeWidth={2.4} />

          {yearlyBalances.map((d, i) => (
            <g key={d.year}>
              {i % Math.max(Math.ceil(yearlyBalances.length / 8), 1) === 0 && (
                <text x={xAt(i)} y={height - 12} textAnchor="middle" className="axis-label">
                  {d.age}세 ({String(d.year).slice(2)})
                </text>
              )}
              <rect
                x={xAt(i) - stepW / 2}
                y={pad.top}
                width={stepW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}

          {hoveredIdx !== null && (
            <g>
              <line
                x1={xAt(hoveredIdx)}
                x2={xAt(hoveredIdx)}
                y1={pad.top}
                y2={height - pad.bottom}
                stroke="#0f172a"
                strokeDasharray="2 2"
              />
              <circle
                cx={xAt(hoveredIdx)}
                cy={yAt(yearlyBalances[hoveredIdx].total)}
                r={4}
                fill="#0f172a"
              />
            </g>
          )}
        </svg>

        {active && (
          <div className="chart-tooltip">
            <div className="tooltip-title">
              {active.year}년 말 (본인 {active.age}세)
            </div>
            <div className="tooltip-row">
              <span>총 잔여자산</span>
              <strong className="tabular-nums">{formatKrw(active.total)}원</strong>
            </div>
            <div className="tooltip-row">
              <span>현금 잔액</span>
              <strong className={`tabular-nums ${active.cash < 0 ? "text-danger" : ""}`}>
                {formatKrw(active.cash)}원
              </strong>
            </div>
            <div className="tooltip-row">
              <span>주식 잔액</span>
              <strong className="tabular-nums">{formatKrw(active.stock)}원</strong>
            </div>
            <div className="tooltip-row">
              <span>퇴직연금/IRP</span>
              <strong className="tabular-nums">{formatKrw(active.retirement)}원</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
