interface UsageGuideProps {
  showWelcome: boolean;
  onStart: () => void;
  onLoadExample: () => void;
  onOpenProjects: () => void;
}

export default function UsageGuide({
  showWelcome,
  onStart,
  onLoadExample,
  onOpenProjects,
}: UsageGuideProps) {
  return (
    <section
      aria-labelledby="usage-guide-title"
      className="rounded-lg border border-[var(--cp-border)] bg-white p-4"
    >
      {showWelcome ? (
        <>
          <p className="text-[11px] font-medium text-slate-500">
            처음 시작하기
          </p>

          <h2
            id="usage-guide-title"
            className="mt-1 text-base font-semibold tracking-tight text-slate-900"
          >
            공간을 입력하고 예상 발주량을 검토하세요
          </h2>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            천장 치수와 자재 조건을 입력하고, 필요한 현장 조정값을 반영해
            수량·금액·계산 근거를 확인합니다.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onStart}
              className="cp-button-primary"
            >
              직접 입력하기
            </button>

            <button
              type="button"
              onClick={onLoadExample}
              className="cp-button-secondary"
            >
              예시로 체험하기
            </button>

            <button
              type="button"
              onClick={onOpenProjects}
              className="cp-button-secondary"
            >
              저장한 프로젝트 열기
            </button>
          </div>
        </>
      ) : (
        <h2 id="usage-guide-title" className="sr-only">
          사용 안내
        </h2>
      )}

      <details className={showWelcome ? "mt-4" : ""}>
        <summary className="cursor-pointer text-xs font-medium text-slate-600">
          사용 순서와 저장 방식
        </summary>

        <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-6 text-slate-600">
          <li>공간 형태와 실제 치수를 입력합니다.</li>
          <li>간격·보드 규격·겹수·Loss·정척·단가를 입력합니다.</li>
          <li>현장 요소를 배치하고 필요한 자재 증감을 직접 입력합니다.</li>
          <li>계산 후 결과와 자재별 계산 근거를 확인합니다.</li>
          <li>프로젝트를 수동 저장하고 필요한 자료는 JSON으로 백업합니다.</li>
        </ol>

        <dl className="mt-4 space-y-3 border-t border-slate-100 pt-3 text-xs leading-5">
          <div>
            <dt className="font-semibold text-slate-700">프로젝트 저장</dt>
            <dd className="mt-1 text-slate-500">
              현재 브라우저의 프로젝트 목록에 보관합니다.
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-700">자동 임시저장</dt>
            <dd className="mt-1 text-slate-500">
              적용된 작업을 복구하기 위한 임시본입니다. 수동 저장을 대신하지
              않습니다.
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-700">JSON 백업</dt>
            <dd className="mt-1 text-slate-500">
              프로젝트를 파일로 보관하거나 다른 브라우저에서 가져옵니다. 도면
              배경 이미지와 별도 템플릿·계산안 목록은 포함되지 않습니다.
            </dd>
          </div>
        </dl>

        <p className="mt-3 rounded-md bg-slate-50 p-3 text-[11px] leading-6 text-slate-500">
          예시 수치는 기능 체험용이며 시공 권장값이나 실제 시장 단가가 아닙니다.
          현장 요소만으로 자재를 자동 공제·보강하지 않습니다. 입력 변경 후에는
          다시 계산하세요.
        </p>
      </details>
    </section>
  );
}
