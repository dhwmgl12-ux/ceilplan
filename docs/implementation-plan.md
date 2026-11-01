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
      UsageGuide.tsx

  types/
    ceilplan.ts

  lib/
    calculations/
      base.ts
    project-storage.ts
    project-io.ts
    result-csv.ts
    download.ts
    example-project.ts

  tests/
    base.test.mjs
    project-io.test.mjs
    result-csv.test.mjs
    project-storage.test.mjs
    example-project.test.mjs

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

- `/`: 단일 공간 작업
- `/housing`: 세대 타입·다중 공간 관리

작업 화면:

- 공간·자재 설정: 공간 형태·치수·자재 조건·Loss·정척·단가
- 요소 편집: 요소 추가·목록·캔버스·선택 속성·현장 조정값
- 산출 검토: 예상 발주량·금액·상세 내역·계산 근거·검토·계산안 비교

반응형:

- 1280px 이상: 요소 편집에서 도구·캔버스·속성 3열
- 1280px 미만: 도구·캔버스·속성 영역 전환
- 높이가 낮은 데스크톱: 페이지 스크롤로 콘텐츠 접근
- 긴 표: 표 영역 내부 가로 스크롤

상태와 보관:

- 같은 공간의 작업 탭 전환은 컴포넌트를 유지하고 CSS로 표시 전환
- 미적용 폼 입력과 프로젝트 미저장 변경사항 구분
- 현재 적용된 입력과 마지막 계산 Snapshot 분리
- 적용된 입력 변경·결과 복원 시 재계산 필요 표시
- 이전 결과의 CSV·발주용 보기 비활성화
- 속성과 조정값은 별도로 검증·적용
- 정상 임시저장은 간단히 표시하고 복구 대기·오류는 별도로 안내
- 실제 공간 전환 전 최신 적용 입력을 부모 프로젝트에 보관
- 실제 공간 전환 시 미적용 입력·편집 이력·배경은 초기화

구현과 검증 완료는 구분한다.
실제 검사 결과는 ui-verification.md와 release-checklist.md에 기록한다.

## 5. 현재 제한

- 면적 기반 예상 계산
- 현장 요소별 자동 공제·보강 미지원
- 부재 배치·절단·잔재 최적화 미지원
- 미적용 폼 입력 자동 저장·전환 차단 미지원
- 도면 배경 영구 저장 미지원
- 기타 자재·단가표는 기반 모듈 단계
- 로그인·서버 저장·기기 간 동기화 미지원
- 구조 안전 및 시공 적합성 판정 미지원

## 6. UI 개선 후 마무리

1. 린트·타입 검사·테스트·빌드 결과 기록
2. 빌드 후 실제 브라우저 동작 검증
3. 390·768·1279·1280·1440·1920px 화면 점검
4. 실패 사례 수정과 재검증
5. 문서와 실제 구현 차이 정리

검증 결과는 ui-verification.md와 release-checklist.md에 기록한다.
미실행 항목은 완료로 표시하지 않는다.

## 7. 검증 원칙

- 기능 변경에 맞는 테스트를 추가한다.
- 자동 검사와 브라우저 검증을 구분한다.
- 확인하지 않은 항목은 완료 처리하지 않는다.
- 발견한 문제는 재현 방법과 함께 기록한다.
- 공식 시공 기준과 제품 계산 정책을 구분한다.

## 작업 화면 재구성 기준

목표 화면과 동작은 [작업 화면 기준](workspace-spec.md)을 따른다.

이 문서의 기존 구현 현황과 새 화면의 목표 상태를 구분한다.
새 기준 문서 작성만으로 구현 완료로 표시하지 않는다.

진행 순서:

1. 화면·동작 기준 확정
2. 작업 화면 골격
3. 헤더·프로젝트 명령
4. 작업 탭 연결
5. 공간·자재 설정
6. 요소 도구·목록
7. 캔버스·선택 동작
8. 속성·조정값
9. 산출 검토
10. 상태·복구·다중 공간
11. 반응형·키보드 접근
12. 회귀 검증·문서 갱신
