# Pension

노후 수입 설계 서비스의 초기 기획 및 엔지니어링 문서 저장소입니다.

이 저장소는 한국 거주자를 기준으로 현재 사용자와 선택 입력인 배우자의
생년월일, 재직 중 월수입, 퇴직금, 희망퇴직위로금, 부동산 월세, 연금,
IRP, 저축, 주식 투자금 등 수입 창출 수단을 입력받아 본인이 100세가
되는 해까지 월별 세후 수입을 프로젝션하는 서비스를 설계하기 위한 문서
체계를 담고 있습니다.

핵심 목표는 Harness Engineering 접근을 통해 계산 신뢰성, 변경 안전성,
설명 가능성, 운영 관측성을 초기 설계 단계부터 확보하는 것입니다.

서비스는 퇴직 이후 목표 월수입이 주어졌을 때 현재 자산을 어떻게
수령하면 좋은지, 또는 은퇴 시점까지 얼마를 더 모아야 하는지도 추천할
수 있어야 합니다.

## MVP 실행

이 저장소에는 외부 의존성 없이 실행되는 초기 MVP가 포함되어 있습니다.

```bash
python3 -m pension_service.server
```

브라우저에서 `http://localhost:8000`을 열면 샘플 입력을 수정해 월별
프로젝션을 실행할 수 있습니다.

## API

### `POST /api/projections`

요청 예시는 `sample_projection.json`을 참고합니다.

```bash
python3 -m pension_service.server
curl -s http://localhost:8000/api/projections \
  -H 'Content-Type: application/json' \
  --data-binary @sample_projection.json
```

응답에는 다음 항목이 포함됩니다.

- 한국 원화 기준 월별 명목/실질 세후 수입
- 근로소득, 퇴직 이벤트, 부동산, 연금, 금융수입, 추천 인출 라인
- 목표 월수입 대비 부족액
- 은퇴시점까지 추가로 모아야 할 금액
- 규칙 버전과 입력 신뢰도 점수

## 테스트

```bash
python3 -m unittest
```
