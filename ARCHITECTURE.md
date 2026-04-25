# Architecture

이 문서는 노후 수입 설계 서비스의 초기 아키텍처 방향을 정의한다. 현재 단계의 목표는 신뢰 가능한 월별 현금흐름 프로젝션을 만들기 위한 도메인 경계, 데이터 흐름, 검증 지점을 명확히 하는 것이다.

## System Context

사용자는 본인과 현재 배우자의 생년월일, 보유 자산, 임대 수입, 연금 및 금융자산을 입력한다. 시스템은 해당 입력을 기준으로 월 단위 수입을 계산하고, 연령별 현금흐름과 주요 리스크를 시각화한다.

```text
User
  -> Onboarding and asset intake
  -> Scenario builder
  -> Projection engine
  -> Reliability harness
  -> Monthly income report
```

## Core Components

### 1. Product Intake

- 본인 및 배우자 생년월일
- 거주 국가 및 통화
- 은퇴 목표 연령
- 예상 수명 또는 분석 종료 연령
- 부동산, 금융자산, 연금, 기타 현금흐름
- 세금, 공실률, 물가상승률 등 가정값

### 2. Domain Model

초기 도메인 객체는 다음을 중심으로 설계한다.

- `Household`: 사용자와 배우자, 거주지, 분석 기간
- `Person`: 생년월일, 은퇴 연령, 연금 개시 연령
- `Asset`: 부동산, 예금, 투자금, 연금, 기타 수입원
- `IncomeStream`: 월별 또는 연별 수입 규칙
- `ExpenseAdjustment`: 세금, 유지보수비, 공실 손실, 관리비
- `Scenario`: 기본, 보수, 낙관 등 가정 묶음
- `Projection`: 월별 수입 산출 결과

### 3. Projection Engine

프로젝션 엔진은 입력값과 시나리오를 받아 월별 수입 타임라인을 생성한다.

- 생년월일 기반 연령 계산
- 연금 개시 시점 반영
- 임대료 증가율 및 공실률 반영
- 투자자산 인출률 또는 배당/이자 수익 반영
- 부동산 매각 또는 대출 상환 이벤트 반영
- 부부 중 한 명 사망 시 연금 및 수입 변화 반영

### 4. Reliability Harness

Harness Engineering은 계산 로직의 신뢰성을 확보하는 별도 레이어로 둔다.

- 결정적 테스트 케이스: 고정 입력에 대한 월별 결과 스냅샷
- 속성 기반 테스트: 월별 기간, 나이 계산, 수입 합계 불변식 검증
- 경계값 테스트: 윤년 생일, 월말 생일, 배우자 없음, 음수 현금흐름
- 회귀 테스트: 세법/연금 규칙 변경 전후 결과 비교
- 설명 가능성 테스트: 산출 결과의 근거 항목 추적

### 5. Reporting Layer

- 월별 총수입
- 수입원별 breakdown
- 사용자와 배우자 연령
- 세후/세전 수입 비교
- 리스크 플래그: 현금흐름 공백, 과도한 단일 자산 의존, 물가 조정 부족

## Data Flow

```text
Input Form
  -> Validation
  -> Normalized Domain Model
  -> Scenario Assumptions
  -> Projection Engine
  -> Harness Checks
  -> Report API
  -> UI
```

## Reliability Boundaries

계산 엔진은 UI나 저장소 구현과 분리한다. 동일한 입력과 동일한 가정값은 항상 동일한 프로젝션을 반환해야 하며, 모든 통화/날짜 계산은 명시적 타입을 사용한다.

## Initial Technology Assumptions

아직 구현 언어와 프레임워크는 결정하지 않았다. 다만 초기 선택 기준은 다음과 같다.

- 날짜 및 금융 계산 테스트가 쉬울 것
- 문서화된 도메인 규칙을 코드로 옮기기 쉬울 것
- API와 계산 엔진을 분리할 수 있을 것
- CI에서 빠르게 하네스 테스트를 실행할 수 있을 것
