# Design Docs

노후 수입 설계 서비스의 제품/도메인/시스템 설계 문서 인덱스입니다.

## Documents

- [Core Beliefs](./core-beliefs.md): 제품과 엔지니어링 의사결정의 기준
- [Projection Model](./projection-model.md): 월별 수입 프로젝션 모델 초안
- [Harness Engineering](./harness-engineering.md): 신뢰성 확보를 위한 하네스 설계
- [Korea Rule Adapters](./korea-rule-adapters.md): 한국 연금, 세금, 주택연금 규칙 어댑터 설계

## Design questions to resolve

1. 한국 공식 데이터 소스와 계산기 결과를 어떤 주기로 갱신하고 검증할 것인가?
2. 국민연금, 퇴직연금, 개인연금, 주택연금별 수령 시점 민감도를 어떻게 한 화면에서 비교할 것인가?
3. 목표 월수입 달성을 위한 추천을 어느 수준까지 자동화하고 어떤 경고를 함께 제공할 것인가?
4. 재직 중 근로소득, 퇴직금, 희망퇴직위로금, IRP 납입 계획을 어떻게 하나의 월별 타임라인에 통합할 것인가?
5. 사용자에게 "정확한 예측"이 아니라 "가정 기반 설계"임을 어떻게 명확히 전달할 것인가?
