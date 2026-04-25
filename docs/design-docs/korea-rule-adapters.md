# Korea Rule Adapters

## Purpose

한국 기준의 노후 수입 설계는 사용자가 모든 제도 계산식을 직접 알지 않아도
국민연금, 사적연금, IRP, 주택연금, 퇴직금, 세금 규칙을 자동으로 반영해야
한다. 이 문서는 외부 제도 규칙을 계산 엔진에 안전하게 연결하는 어댑터
설계를 정의한다.

## Adapter principles

1. 공식 또는 검증 가능한 출처를 우선한다.
2. 규칙, 입력값, 산출값, 출처 URL, 적용일을 함께 저장한다.
3. 출처가 계산식을 공개하지 않는 경우 공식 계산기나 사용자가 입력한 결과를
   버전 관리된 추정값으로 저장한다.
4. 계산 결과는 항상 설명 trace에 포함한다.
5. 제도 변경은 기존 시나리오 결과를 덮어쓰지 않고 새 assumption version을
   만든다.

## Initial adapters

| Adapter | Responsibility | Inputs | Output |
| --- | --- | --- | --- |
| `NationalPensionRuleAdapter` | 국민연금 정상/조기/연기 수령액 조정 | 출생연도, 예상 정상 월수령액, 선택 개시월 | 월별 세후 국민연금 수입 |
| `PrivatePensionAdapter` | 개인연금, 연금저축, 퇴직연금의 수령 계획 | 현재 잔액, 납입 계획, 수익률, 개시월 | 월별 연금 수입 및 잔액 |
| `IrpAdapter` | IRP 현재 수준과 향후 입금 계획 반영 | 현재 IRP 잔액, 월/연 납입액, 예상 수익률, 수령 전략 | 은퇴 전 적립액, 은퇴 후 월별 수령액 |
| `HousingPensionAdapter` | 주택담보 연금 예상 수령액 반영 | 주택가액, 가입 연령, 지급 유형 | 월별 주택연금 수입 |
| `EmploymentExitAdapter` | 재직 중 급여, 퇴직금, 희망퇴직위로금 반영 | 월급여, 퇴직 예정월, 근속기간, 퇴직금/위로금 입력값 | 재직 수입과 퇴직 이벤트 현금흐름 |
| `TaxRuleAdapter` | 세목별 비용을 월별 세후 현금흐름에 반영 | 임대소득세, 재산세, 종합소득세, 연금 관련 세금 | 월별 비용 라인 |

## Known rule notes

- 국민연금은 출생연도별 정상 수급 개시 연령이 다르며, 조기 수령과 연기
  수령은 선택 개시 시점에 따라 월 수령액이 달라진다. 이 비율은 규칙
  테이블로 저장하고 출처를 남긴다.
- 주택연금은 한국주택금융공사의 산정 방식과 계산기 결과를 기준으로 다룬다.
  공식 산식이 공개되지 않는 항목은 계산기 결과나 사용자가 입력한 예상액을
  `externally_calculated` 상태로 저장한다.
- IRP와 사적연금은 현재 잔액, 향후 납입 계획, 예상 수익률, 수령 개시월,
  수령 기간을 함께 계산해야 한다.
- 퇴직금과 희망퇴직위로금은 확정 수입이 아니라 이벤트성 현금흐름이다.
  금액이 불확실하면 사용자가 범위를 입력하고 보수/기준/낙관 시나리오에
  배분한다.

## Official source registry

초기 구현은 아래 공식 출처를 우선한다. 블로그, 기사, 커뮤니티 자료는 공식
출처와 대조하기 전에는 계산 규칙으로 승격하지 않는다.

| Domain | Primary source | Usage |
| --- | --- | --- |
| 국민연금 | 국민연금공단 `nps.or.kr` | 출생연도별 수급 개시 연령, 조기/연기 수령 조정, 가입기간 조건 |
| 주택연금 | 한국주택금융공사 `hf.go.kr` | 예상연금조회, 월지급금 예시, 지급 방식별 산정 기준 |
| IRP and pension tax | 국세청 `nts.go.kr`, 국세법령정보시스템 | 연금계좌 원천징수, 이연퇴직소득 연금수령, 세액공제 규칙 |
| retirement allowance tax | 국세청 and 근로복지/고용노동부 official materials | 퇴직소득세와 퇴직급여 관련 기준 |

각 출처는 `source_url`, `source_effective_date`, `retrieved_at`,
`source_checksum`을 함께 저장한다.

## Data contract

Each adapter response should include:

- `adapter_name`
- `adapter_version`
- `source_name`
- `source_url`
- `source_effective_date`
- `input_digest`
- `calculation_method`: `formula`, `table_lookup`, `official_calculator`,
  `user_provided`, or `estimate`
- `monthly_lines`
- `warnings`
- `confidence`

## Reliability checks

- 출생연도별 국민연금 수급 개시 연령 경계값을 테스트한다.
- 조기 수령 월이 빨라질수록 국민연금 월액이 증가하지 않는지 확인한다.
- 연기 수령 월이 늦어질수록 국민연금 월액이 감소하지 않는지 확인한다.
- 동일한 주택가액에서 가입 연령이 높아질 때 주택연금 월액이 낮아지지 않는지
  검증한다. 단, 지급 유형이 같을 때만 비교한다.
- IRP 납입액을 늘리면 은퇴시점 예상 잔액이 감소하지 않는지 확인한다.
- 세목별 비용의 월별 합계가 세후 현금흐름에서 정확히 차감되는지 확인한다.
