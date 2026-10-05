export default function Sidebar() {
  return (
    <aside className="border-b border-blue-100 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-48 lg:border-r">
      <div className="px-6 py-6 text-2xl font-bold tracking-tight">
        <span className="text-cyan-600">Ceil</span>
        <span className="text-slate-900">Plan</span>
      </div>

      <nav aria-label="메인 메뉴" className="flex gap-2 px-3 pb-4 lg:flex-col">
        <a
          href="#dashboard"
          aria-current="page"
          className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600"
        >
          대시보드
        </a>

        <span className="px-4 py-3 text-sm text-slate-400">
          프로젝트 · 준비 중
        </span>

        <a
          href="#results"
          className="rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-blue-50"
        >
          산출 결과
        </a>
      </nav>

      <p className="absolute bottom-6 left-6 hidden text-xs text-slate-400 lg:block">
        CeilPlan MVP
      </p>
    </aside>
  );
}
