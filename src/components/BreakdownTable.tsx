import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { MonthlyProjectionRow } from "../types/projection";
import { formatKrw } from "../utils/format";

interface BreakdownTableProps {
  monthly: MonthlyProjectionRow[];
  retirementAge: number;
}

type Granularity = "yearly" | "monthly";
type RowFilter = "all" | "retired" | "negative";

interface BreakdownSeriesRow {
  key: string;
  label: string;
  kind: "income" | "expense" | "summary" | "balance";
  kindLabel: string;
  values: Map<string, number>;
}

export const BreakdownTable: React.FC<BreakdownTableProps> = ({
  monthly,
  retirementAge
}) => {
  const [granularity, setGranularity] = useState<Granularity>("yearly");
  const [filter, setFilter] = useState<RowFilter>("all");

  const filteredMonths = useMemo(() => {
    let base = monthly;
    if (filter === "retired") {
      base = base.filter((r) => r.user_age >= retirementAge);
    } else if (filter === "negative") {
      base = base.filter((r) => r.nominal_total < 0 || r.cash_balance < 0);
    }

    if (granularity === "yearly") {
      const byYear = new Map<string, MonthlyProjectionRow>();
      for (const r of base) {
        const yr = r.month.slice(0, 4);
        if (!byYear.has(yr)) {
          byYear.set(yr, r); // first month of that year (or filtered subset)
        }
      }
      return Array.from(byYear.values());
    }
    return base;
  }, [monthly, filter, granularity, retirementAge]);

  const seriesRows = useMemo<BreakdownSeriesRow[]>(() => {
    const map = new Map<string, BreakdownSeriesRow>();

    for (const m of filteredMonths) {
      for (const line of m.lines) {
        const key = `${line.category}:${line.source}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            label: line.source,
            kind: line.amount < 0 ? "expense" : "income",
            kindLabel: line.amount < 0 ? "지출" : "수입",
            values: new Map()
          });
        }
        map.get(key)!.values.set(m.month, line.amount);
      }

      const addSummary = (
        key: string,
        label: string,
        kind: "summary" | "balance",
        kindLabel: string,
        val: number
      ) => {
        if (!map.has(key)) {
          map.set(key, { key, label, kind, kindLabel, values: new Map() });
        }
        map.get(key)!.values.set(m.month, val);
      };

      addSummary("summary:nominal", "월 총수입(순수지)", "summary", "합계", m.nominal_total);
      addSummary("summary:real", "실질 순수지(물가반영)", "summary", "합계", m.real_total);
      addSummary("balance:cash", "현금 잔액", "balance", "잔액", m.cash_balance);
      addSummary("balance:stock", "주식 잔액", "balance", "잔액", m.stock_balance);
      addSummary("balance:retirement", "퇴직연금 잔액", "balance", "잔액", m.retirement_balance);
    }

    const rank: Record<BreakdownSeriesRow["kind"], number> = {
      income: 1,
      expense: 2,
      summary: 3,
      balance: 4
    };

    return Array.from(map.values()).sort(
      (a, b) => rank[a.kind] - rank[b.kind] || a.label.localeCompare(b.label, "ko")
    );
  }, [filteredMonths]);

  const exportCsv = () => {
    const headers = [
      "월",
      "본인연령",
      "배우자연령",
      "명목순수지",
      "실질순수지",
      "현금잔액",
      "주식잔액",
      "퇴직연금잔액",
      "총잔여자산"
    ];
    const lines = [
      headers.join(","),
      ...monthly.map((r) =>
        [
          r.month,
          r.user_age,
          r.spouse_age ?? "",
          r.nominal_total,
          r.real_total,
          r.cash_balance,
          r.stock_balance,
          r.retirement_balance,
          r.remaining_financial_assets
        ].join(",")
      )
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pension-projection-${monthly[0]?.month ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div>
          <h3>현금흐름 상세 내역</h3>
          <span className="card-subtitle">
            표시 열: {filteredMonths.length}개 (전체 {monthly.length}개월)
          </span>
        </div>
        <div className="toolbar-actions">
          <div className="segmented-control" role="group" aria-label="단위 선택">
            <button
              type="button"
              className={granularity === "yearly" ? "active" : ""}
              onClick={() => setGranularity("yearly")}
            >
              연도별 대표월
            </button>
            <button
              type="button"
              className={granularity === "monthly" ? "active" : ""}
              onClick={() => setGranularity("monthly")}
            >
              월별 전체
            </button>
          </div>

          <div className="segmented-control" role="group" aria-label="필터 선택">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              전체
            </button>
            <button
              type="button"
              className={filter === "retired" ? "active" : ""}
              onClick={() => setFilter("retired")}
            >
              은퇴 이후
            </button>
            <button
              type="button"
              className={filter === "negative" ? "active" : ""}
              onClick={() => setFilter("negative")}
            >
              적자/마이너스
            </button>
          </div>

          <button type="button" className="btn-ghost-sm" onClick={exportCsv}>
            <Download size={14} />
            CSV 내보내기
          </button>
        </div>
      </div>

      {filteredMonths.length === 0 ? (
        <div className="empty-table">선택한 조건에 해당하는 기간이 없습니다.</div>
      ) : (
        <div className="table-wrap">
          <table id="projection-table" className="breakdown-table">
            <thead>
              <tr>
                <th className="sticky-col">항목 구분</th>
                {filteredMonths.map((m) => (
                  <th key={m.month} className="tabular-nums">
                    <div>{m.month}</div>
                    <div className="th-age">{m.user_age}세</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody id="projection-body">
              {seriesRows.map((row) => {
                const hasNeg = Array.from(row.values.values()).some((v) => v < 0);
                const rowClasses = [
                  `row-${row.kind}`,
                  row.key === "balance:cash" && hasNeg ? "negative-cash" : "",
                  row.key === "summary:nominal" && hasNeg ? "negative-total" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={row.key} className={rowClasses}>
                    <th className="sticky-col">
                      <span className={`kind-pill kind-${row.kind}`}>
                        {row.kindLabel}
                      </span>
                      <span>{row.label}</span>
                    </th>
                    {filteredMonths.map((m) => {
                      const val = row.values.get(m.month) ?? 0;
                      const isNegAlert =
                        val < 0 &&
                        (row.key === "balance:cash" ||
                          row.key === "summary:nominal" ||
                          row.key === "summary:real");
                      return (
                        <td
                          key={m.month}
                          className={`tabular-nums ${isNegAlert ? "negative" : ""}`}
                        >
                          {formatKrw(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
