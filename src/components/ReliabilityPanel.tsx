import React from "react";
import { CheckCircle, Info, Shield } from "lucide-react";
import type { ProjectionResponse } from "../types/projection";

interface ReliabilityPanelProps {
  data: ProjectionResponse;
}

const RULE_LABELS: Record<string, string> = {
  national_pension: "국민연금 수령액 규칙",
  national_pension_contribution: "국민연금 납입 규칙",
  housing_pension: "주택연금 월지급금 추정",
  health_insurance: "건강보험료(지역가입자 등) 추정",
  tax: "근로/연금 세금 처리",
  real_estate_income_tax: "임대소득 한계세율 비용"
};

export const ReliabilityPanel: React.FC<ReliabilityPanelProps> = ({ data }) => {
  return (
    <div className="reliability-grid">
      <div className="reliability-card">
        <div className="card-header-inline">
          <h3>
            <Shield size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            적용 규칙 버전 (Rule Adapters)
          </h3>
          <span className="badge-neutral">KR / KRW</span>
        </div>
        <p className="card-subtitle">
          동일한 입력과 동일한 규칙 버전을 사용하면 언제나 동일한 결과를 재현합니다.
        </p>
        <dl className="rule-list">
          {Object.entries(data.rule_versions).map(([key, version]) => (
            <div key={key} className="rule-row">
              <dt>{RULE_LABELS[key] ?? key}</dt>
              <dd>
                <code>{version}</code>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="reliability-card">
        <div className="card-header-inline">
          <h3>
            <Info size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            신뢰도 및 모델 범위 안내
          </h3>
          <span className="badge-ok">
            <CheckCircle size={12} /> 신뢰도 {data.confidence_score}점
          </span>
        </div>

        <ul className="scope-list">
          <li>
            <strong>결정적 프로젝션:</strong> 본 계산은 확률적 시뮬레이션이 아닌 입력 가정에 기반한 결정적 월별 현금흐름 모델입니다.
          </li>
          <li>
            <strong>제외된 항목 (초기 범위):</strong> 배우자 사망, 상속, 유족연금, 부동산 매각 차익 및 공실률 변동은 포함되지 않습니다.
          </li>
          <li>
            <strong>의사결정 지원용:</strong> 본 결과는 재무 의사결정 참고 자료이며 보장된 투자·세무 자문이 아닙니다.
          </li>
        </ul>

        {data.warnings.length > 0 && (
          <div className="warning-list">
            <h4>검증 경고</h4>
            <ul>
              {data.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
