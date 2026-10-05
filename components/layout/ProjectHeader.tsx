export default function ProjectHeader() {
  return (
    <header className="border-b border-blue-100 bg-white px-5 py-6 sm:px-6">
      <p className="mb-2 text-xs text-slate-500">프로젝트 / 천장 자재 산출</p>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          새 현장 프로젝트
        </h1>

        <span className="rounded-md bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">
          MVP
        </span>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div className="flex gap-2">
          <dt className="text-slate-500">면적</dt>
          <dd className="font-medium">입력 대기</dd>
        </div>

        <div className="flex gap-2">
          <dt className="text-slate-500">천장 방식</dt>
          <dd className="font-medium">M-BAR + 석고보드</dd>
        </div>

        <div className="flex gap-2">
          <dt className="text-slate-500">저장 상태</dt>
          <dd className="font-medium">저장 전</dd>
        </div>
      </dl>
    </header>
  );
}
