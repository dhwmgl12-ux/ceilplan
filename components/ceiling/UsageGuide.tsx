export default function UsageGuide() {
  return (
    <details className="cp-card">
      <summary className="cursor-pointer text-sm font-semibold text-blue-700">
        처음 사용하시나요? 사용 순서 보기
      </summary>

      <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            빠르게 체험하려면 상단의
            <strong> 예시 프로젝트 불러오기</strong>를 누르세요.
          </li>
          <li>
            현장명과 공간 치수, 자재 간격·규격·겹수·Loss·정척·단가를 입력하거나
            수정하세요.
          </li>
          <li>
            필요한 현장 요소를 등록하고, 자재 증감이 있다면 현장 조정값에 수량과
            사유를 직접 입력하세요.
          </li>
          <li>
            <strong>예상 자재 계산하기</strong>를 누르고 요약·상세 수량·자재별
            계산 근거를 확인하세요.
          </li>
          <li>
            프로젝트를 저장하거나 JSON으로 백업하세요. 계산을 완료한 결과는
            CSV로 다운로드할 수 있습니다.
          </li>
        </ol>

        <div className="rounded-lg bg-blue-50 p-3 text-xs leading-6 text-blue-900">
          <p>
            예시의 간격·규격·Loss·단가·조정값은 체험과 검산을 위한 가상
            입력입니다. 공식 시공 기준이나 권장값이 아닙니다.
          </p>
          <p className="mt-2">
            현장 요소의 크기만으로 자재 증감을 자동 계산하지 않습니다. 조정값은
            사용자가 직접 검토해 입력합니다.
          </p>
        </div>

        <p className="text-xs leading-6 text-slate-500">
          입력을 수정하면 이전 결과는 재계산 필요 상태가 됩니다. 브라우저 저장은
          다른 기기와 동기화되지 않으므로 필요한 프로젝트는 JSON으로 백업하세요.
        </p>
      </div>
    </details>
  );
}
