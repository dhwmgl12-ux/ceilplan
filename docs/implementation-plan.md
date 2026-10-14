# CeilPlan 구현 현황과 보완 계획

## 1. 현재 파일 구조

```text
ceilplan/
  app/
    page.tsx
    layout.tsx
    globals.css
    error.tsx
    not-found.tsx

  components/
    layout/
      Sidebar.tsx
      ProjectHeader.tsx
    ceiling/
      CeilingWorkspace.tsx
      InputPanel.tsx
      MaterialInputPanel.tsx
      CeilingPreview.tsx
      FeatureInputPanel.tsx
      AdjustmentInputPanel.tsx
      ProjectManager.tsx
      ResultsPanel.tsx
      CalculationBreakdown.tsx

  types/
    ceilplan.ts

  lib/
    calculations/
      base.ts
    project-storage.ts
    project-io.ts
    result-csv.ts
    download.ts

    tests/
    base.test.mjs
    project-io.test.mjs
    result-csv.test.mjs
    project-storage.test.mjs

  docs/
    product-spec.md
    domain-rules.md
    implementation-plan.md
    release-checklist.md
```

## 2. 구현된 기능

- 현장명과 직사각형 공간 치수 입력
- 자재 간격·보드 규격·겹수·Loss·정척·단가 입력
- 석고보드·M-BAR·캐링의 면적 기반 기본 물량 계산
- 현장 요소 위치·크기 입력과 SVG 표시·삭제
- 사용자 입력 현장 조정값 추가·목록·삭제
- 기본 물량에 현장 추가·공제를 반영한 후 Loss 적용
- 구매 단위 환산과 발주 올림
- 예상 발주 수량과 금액
- 계산 Snapshot과 자재별 계산 근거 상세보기
- 프로젝트 브라우저 저장·목록·불러오기
- 이전 저장 형식 호환
- 프로젝트 JSON 내보내기·가져오기
- Snapshot 결과 CSV 다운로드
- 입력 변경 및 결과 복원 시 재계산 필요 표시
- 공통 카드·입력·버튼 스타일
- 미저장 변경 시 브라우저 이탈 확인
- 오류 목록 포커스와 본문 바로가기
- 오류 화면과 404 화면

구현 여부와 검증 통과 여부는 구분한다.
검증 결과는 release-checklist.md에 기록한다.

## 3. 계산 흐름

기본 이론 물량
→ 사용자 입력 현장 추가·공제
→ 조정 후 이론 물량
→ Loss 적용
→ 구매 단위 환산
→ 발주 올림
→ 사용자 단가 적용
→ 예상 금액

석고보드 조정값은 공간 면적(㎡)으로 입력하며,
보드 규격과 겹수를 적용해 장수로 변환한다.

M-BAR와 캐링 조정값은 연장(m)으로 입력한다.

현장 요소의 크기만으로 자재 증감을 자동 계산하지 않는다.

## 4. 화면과 상태

- 데스크톱 1280px 이상: 입력·미리보기·결과 3열
- 작은 화면: 세로 배치와 작업 영역 바로가기
- 현재 입력과 마지막 계산 Snapshot은 분리
- 입력 변경 시 이전 결과를 유지하고 재계산 필요 표시
- 결과 복원 시 재계산 필요 표시
- 재계산 필요 상태에서는 CSV 다운로드 비활성화
- JSON에는 현재 입력과 마지막 Snapshot을 함께 보관

미저장 상태와 재계산 필요 상태는 서로 다르다.

## 5. 현재 제한

- 직사각형 공간 1개
- 면적 기반 예상 물량
- 현장 요소별 자동 공제·보강 미지원
- 실제 골조 배치·절단·잔재 최적화 미지원
- 현장 요소와 조정값의 직접 수정 UI 미지원
- 로그인·서버 DB·기기 간 동기화 미지원
- 기타 자재 수동 입력 미지원
- 구조 안전 판단 및 시공 승인 미지원

JSON 검증은 형식·숫자 범위·요소 연결을 확인한다.
가져온 결과의 계산 정확성을 보증하지 않는다.

## 6. 다음 보완 순서

1. 문서와 검증 기록 정리
2. 계산 오류 시 이동 처리 통일
3. 소수 추가·공제 경계 사례 테스트
4. 현장 요소와 조정값 수정 기능
5. 브라우저 저장 전용 테스트
6. 작은 SVG 요소의 번호 표시
7. 예시 프로젝트와 사용 안내

기타 자재는 핵심 기능 검증 후 별도 단계로 검토한다.

## 7. 검증 원칙

- 기능 변경에 맞는 테스트를 추가한다.
- 자동 검사와 브라우저 검증을 구분한다.
- 확인하지 않은 항목은 완료 처리하지 않는다.
- 발견한 문제는 재현 방법과 함께 기록한다.
- 공식 시공 기준과 제품 계산 정책을 구분한다.
