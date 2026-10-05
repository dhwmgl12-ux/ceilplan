# CeilPlan 개발 순서와 파일 구조

## 1. 개발 순서

1. AGENTS.md, product-spec.md, domain-rules.md에서 범위 확인
2. 참고 시안의 사이드바·헤더·입력/미리보기/결과 레이아웃 구현
3. 사용자 입력과 SVG, 현장 요소 표시 연결
4. 프로젝트 생성·브라우저 저장·불러오기 연결
5. 기본 수량 산출 방식을 사용자와 확정
6. 기본 수량 → Loss → 구매 단위 올림 → 단가 적용 순수 함수 구현
7. 사용자 검산 사례로 계산 테스트 작성
8. 현장 요소 계산을 기준이 확인된 종류부터 추가

## 2. 현재 파일 구조

```text
ceilplan/
  app/
    page.tsx                    # Server Component: 대시보드 진입
    layout.tsx                  # 한국어 문서, 메타데이터
    globals.css                 # Tailwind, 공통 스타일
  components/ceilplan/
    Dashboard.tsx               # Client Component: 상태, 저장, 화면 연결
    Panel.tsx                   # 공통 카드
    InputPanel.tsx              # 현장·조건·Loss·단가 입력
    CeilingPreview.tsx          # SVG, 현장 요소 입력·삭제
    ResultsPanel.tsx            # 요약·상세 표·금액·계산 근거
    components/layout/
    ProjectHeader.tsx
    Sidebar.tsx
  types/
    ceilplan.ts                 # 입력, 프로젝트, 현장 요소, 결과 타입
  lib/
    calculations/base.ts        # 입력 검증, 면적, 미확정 산출 상태
    project-storage.ts          # 브라우저 저장, 저장 데이터 검증
  docs/
    product-spec.md
    domain-rules.md
    implementation-plan.md
```

## 3. 첫 구현의 동작

- 데스크톱 1360px 이상에서 3열, 작은 화면에서는 세로 스택
- 공간 치수로 면적과 SVG 비율 갱신
- 현장 요소는 위치·크기 입력으로 표시, 계산에는 아직 반영하지 않음
- 프로젝트 생성, 목록, 브라우저 저장/불러오기
- 사용자 입력의 음수·빈 값 검증
- 결과 확인 이후 입력을 변경하면 재계산 필요 표시
- 단가 미입력은 0원과 구분

## 4. 실제 기준 확인 필요

간격과 규격은 입력받지만, 다음 산출 방식은 문서에서 확정되지 않았다.

- M-BAR/캐링: 면적÷간격으로 총길이를 추정할지, 배치 줄 수로 계산할지
- 골조 배치 방향과 가장자리 처리
- 석고보드: 면적÷1장 면적으로 추정할지, 배치·절단까지 반영할지 및 겹수
- 정척 재료의 절단·잔재와 구매 묶음 단위
- 행거·클립 산출 방식
- 요소별 공제·보강

확정 전에는 수량·금액을 기준 미확정/산출 대기로 표시한다.
시안의 예시 수량·단가·금액을 기본값이나 계산식으로 사용하지 않는다.

현재 엔진 검증 범위는 기하학적 면적, 입력 상태, 미확정 상태다.
실제 천장 물량 계산의 정확성을 검증한 단계는 아니다.
