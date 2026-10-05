# Material Calculation Rules

## 1. Calculation Policy

CeilPlan의 MVP는 구조 설계 또는 시공 승인 프로그램이 아니라
천장 자재의 예상 발주 수량과 예상 금액을 산출하는 도구다.

따라서 계산은 다음 두 종류를 구분한다.

1. 이론 필요량
2. 실제 발주량

계산 흐름:

이론 필요량
→ Loss 적용
→ 구매 규격으로 환산
→ 발주 단위 올림
→ 예상 발주량
→ 단가 적용
→ 예상 발주 금액

Loss로 증가한 수량과
구매 단위 올림으로 증가한 수량은 별도로 표시한다.

---

# 2. M-BAR / Carrying Channel

## 2.1 검토한 방식

### 방식 A: 면적 기반 총길이 계산

공간 면적을 부재 간격으로 나누어
필요한 총 연장(m)을 추정한다.

예:

M-BAR 총길이 ≈ 천장면적 ÷ M-BAR 간격

장점:

- 단순하다.
- 발주용 예상 물량 계산에 적합하다.
- 공간 크기가 달라져도 같은 방식으로 계산 가능하다.

단점:

- 벽에서 첫 부재까지의 거리
- 마지막 부재 위치
- 실제 배치 방향
- 개구부 및 복잡한 형상

등을 정확하게 표현하지 못한다.

### 방식 B: 실제 배치선 기반 계산

공간 치수, 간격, 시작 위치를 이용해
M-BAR와 캐링채널을 실제 선으로 배치하고
각 선의 길이를 합산한다.

장점:

- SVG 배치와 계산 결과를 일치시킬 수 있다.
- 실제 배치에 가까운 계산이 가능하다.

단점:

- 가장자리 처리 기준이 필요하다.
- 현장별 시방과 배치 규칙을 더 많이 알아야 한다.
- MVP 단계에서는 잘못된 가정을 넣을 위험이 있다.

---

## 2.2 MVP 채택 방식

MVP에서는 **방식 A: 면적 기반 예상 총길이 계산**을 채택한다.

이유:

CeilPlan 1차 목표는
정밀 시공도 작성이 아니라
견적 및 예상 발주 물량 계산이기 때문이다.

가장자리 배치 기준과 실제 시공 배치가
충분히 검증되기 전까지
정밀 배치값을 임의로 만들지 않는다.

추후 공식 시방 및 실제 검산 사례가 확보되면
방식 B로 발전시킬 수 있다.

---

## 2.3 M-BAR 총길이

입력:

- ceilingArea: 천장 순면적 (㎡)
- mBarSpacing: M-BAR 간격 (mm)

내부 계산에서는 간격을 m로 변환한다.

공식:

M-BAR 이론 총길이(m)
= 천장 순면적(㎡) ÷ M-BAR 간격(m)

예:

천장 면적 = 52.08㎡
M-BAR 간격 = 300mm = 0.3m

52.08 ÷ 0.3
= 약 173.6m

이 값은 예상 총 연장이며
정밀 시공 배치 길이를 의미하지 않는다.

Status: MVP_ADOPTED

---

## 2.4 Carrying Channel 총길이

입력:

- ceilingArea
- carryingSpacing

공식:

캐링채널 이론 총길이(m)
= 천장 순면적(㎡) ÷ 캐링채널 간격(m)

예:

천장 면적 = 52.08㎡
캐링 간격 = 900mm = 0.9m

52.08 ÷ 0.9
= 약 57.87m

Status: MVP_ADOPTED

---

## 2.5 간격 기준

KCS 41 46 01에서는
경량철골 천장바탕의 경우 다음 기준을 제시한다.

- 반자틀받이: 900mm 이내
- 반자틀: 300mm 이내

CeilPlan에서는 이 값을
사용자가 참고할 수 있는 기준으로 활용할 수 있다.

다만 실제 적용값은 다음을 우선한다.

1. 프로젝트 설계도서
2. 특기시방서
3. 적용 천장 시스템
4. 제조사 기준

따라서 MVP에서는 간격을 사용자가 입력한다.

KCS 기준을 초과하는 값을 입력한 경우
경고 UI를 제공하는 방향을 검토한다.

Source:
KCS 41 46 01

Status: CONFIRMED_REFERENCE

---

# 3. Gypsum Board

## 3.1 검토한 방식

### 방식 A: 면적 기반 장수 계산

천장 순면적을
석고보드 1장의 면적으로 나눈다.

장점:

- 이해하기 쉽다.
- 견적/발주용 계산에 적합하다.
- 구현 및 검증이 쉽다.

단점:

- 절단 배치와 잔재 재사용을 정확히 계산하지 않는다.

### 방식 B: 실제 보드 배치 시뮬레이션

천장에 보드를 실제 크기로 배치하여
절단된 조각과 잔재까지 계산한다.

장점:

- 정확도가 높아질 수 있다.

단점:

- 배치 방향, 이음 규칙, 잔재 재사용 기준이 필요하다.
- MVP 범위를 크게 벗어난다.

---

## 3.2 MVP 채택 방식

MVP에서는 **방식 A: 면적 기반 계산**을 사용한다.

추후 실제 보드 배치 기능이 필요해지면
방식 B를 별도 기능으로 구현한다.

---

## 3.3 석고보드 이론 수량

입력:

- netCeilingArea
- boardWidth
- boardLength
- layerCount

보드 1장 면적:

boardArea
= boardWidth × boardLength

단위는 계산 시 m로 변환한다.

이론 장수:

theoreticalBoardCount
= netCeilingArea ÷ boardArea × layerCount

예:

천장 면적 = 52.08㎡
석고보드 = 900 × 1800mm

보드 1장 면적:

0.9 × 1.8
= 1.62㎡

1겹 기준:

52.08 ÷ 1.62
= 약 32.15장

이론 필요량:
32.15장

이 단계에서는 아직 올림하지 않는다.

Status: MVP_ADOPTED

---

# 4. Loss

Loss는 이론 필요량 계산 후 적용한다.

공식:

lossAppliedQuantity
= theoreticalQuantity × (1 + lossRate / 100)

예:

이론 석고보드:
32.15장

Loss:
7%

32.15 × 1.07
= 34.4005장

Loss 적용 후 필요량:
34.4005장

주의:

7%는 예시 값이며
CeilPlan의 공식 기본값이 아니다.

MVP에서는 사용자가 Loss 비율을 입력한다.

Status: INPUT_BASED

---

# 5. Purchase / Order Rounding

## 5.1 기본 원칙

Loss 적용 결과를 바로 정수로 만들지 않는다.

계산 단계는 반드시 구분한다.

이론 수량
→ Loss 적용 수량
→ 구매 규격 환산
→ 발주 올림

---

## 5.2 석고보드 발주 올림

석고보드는 MVP에서 장 단위로 발주한다고 가정한다.

공식:

orderBoardCount
= ceil(lossAppliedBoardCount)

예:

Loss 적용 후:
34.4005장

발주 수량:
35장

발주 올림 증가량:

35 - 34.4005
= 0.5995장

UI에서는 필요하면 다음처럼 표시한다.

이론 수량 32.15장
Loss 증가 +2.25장
Loss 적용 후 34.40장
발주 올림 +0.60장
최종 발주 35장

Status: MVP_ADOPTED

---

# 6. Metal Material Purchase Rounding

M-BAR와 캐링채널은
총 연장을 그대로 발주하지 않고
실제 구매 가능한 정척 단위로 환산한다.

정척 길이는 제조사/거래처에 따라 달라질 수 있으므로
CeilPlan에서 특정 길이를 고정하지 않는다.

사용자가 구매 길이를 입력한다.

입력:

- theoreticalLength
- lossRate
- stockLength

Loss 적용:

requiredLength
= theoreticalLength × (1 + lossRate / 100)

발주 본수:

orderPieceCount
= ceil(requiredLength ÷ stockLength)

최종 발주 길이:

orderedLength
= orderPieceCount × stockLength

발주 단위로 인해 남는 길이:

roundingSurplus
= orderedLength - requiredLength

예:

필요 길이:
21.3m

정척:
4m

21.3 ÷ 4
= 5.325

발주:
6본

실제 주문 길이:
24m

발주 올림으로 생긴 차이:
2.7m

주의:

4m는 계산 방식 설명을 위한 예시이며
CeilPlan의 고정 규격이 아니다.

Status: MVP_ADOPTED

---

# 7. Gypsum Board Specification

석고보드 규격을 하나로 고정하지 않는다.

제조사의 실제 제품 규격을 데이터로 관리하거나
사용자가 규격을 선택한다.

KCC 일반석고보드 공식 자료에서도
두께 및 길이에 따라 여러 규격이 제공된다.

따라서 다음 정보를 데이터로 관리한다.

- boardType
- thickness
- width
- length
- layerCount

Source:
KCC 석고보드 공식 제품 자료

Status: CONFIRMED

---

# 8. Calculation Result Structure

각 자재의 CalculationResult는
최소 다음 정보를 구분해서 보관한다.

- theoreticalQuantity
- featureAdjustment
- quantityBeforeLoss
- lossRate
- lossAmount
- quantityAfterLoss
- purchaseUnit
- orderQuantity
- roundingSurplus
- unitPrice
- estimatedCost

UI에서도 가능하면 다음 흐름을 보여준다.

기본 물량

- 현장 요소 증감
  ↓
  이론 필요량
- Loss
  ↓
  구매 필요량
- 발주 단위 올림
  ↓
  최종 예상 발주량
  ↓
  예상 금액

  ***

# 9. Important Limitation

현재 M-BAR와 캐링채널의 총 연장은
면적과 사용자가 입력한 간격을 기반으로 한
**견적용 예상값**이다.

CeilPlan MVP는 이 값을
정밀 시공도 또는 실제 설치 위치로 해석하지 않는다.

향후 다음 기준이 충분히 확보되면
실제 Line Layout 기반 계산으로 발전시킬 수 있다.

- 가장자리 이격
- 첫 부재 위치
- 마지막 부재 처리
- 부재 연결/이음
- 장애물 우회
- 보강
- 잔재 재사용
