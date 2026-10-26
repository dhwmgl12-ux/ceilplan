import Link from "next/link";

export type SidebarMenu = "dashboard" | "projects" | "results";

interface SidebarProps {
  activeMenu: SidebarMenu;
  onNavigate: (menu: SidebarMenu) => void;
  hasUnsavedChanges: boolean;
}

const menus: {
  id: SidebarMenu;
  label: string;
  path: string;
}[] = [
  {
    id: "dashboard",
    label: "설계 작업",
    path: "M3 3h18v18H3zM3 9h18M9 9v12",
  },
  {
    id: "projects",
    label: "프로젝트 목록",
    path: "M3 7h7l2-3h9v16H3z",
  },
  {
    id: "results",
    label: "산출 결과",
    path: "M4 20h16M7 16v-5M12 16V6M17 16V3",
  },
];

export default function Sidebar({
  activeMenu,
  onNavigate,
  hasUnsavedChanges,
}: SidebarProps) {
  return (
    <aside className="border-b border-[var(--cp-border)] bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-48 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex items-center gap-2.5 px-4 py-4 lg:px-5 lg:py-6">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
        >
          C
        </span>

        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">
            CeilPlan
          </p>
          <p className="text-[10px] text-slate-500">천장 설계·예상 자재 산출</p>
        </div>
      </div>

      <nav aria-label="메인 메뉴" className="px-3 pb-3">
        <p className="mb-2 hidden px-3 text-[10px] font-semibold tracking-wide text-slate-400 lg:block">
          작업 공간
        </p>

        <div className="grid grid-cols-3 gap-1 lg:flex lg:flex-col">
          {menus.map((menu) => {
            const selected = activeMenu === menu.id;

            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => onNavigate(menu.id)}
                aria-current={selected ? "location" : undefined}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors lg:justify-start lg:px-3 ${
                  selected
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={menu.path} />
                </svg>

                {menu.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <Link
            href="/housing"
            onClick={(event) => {
              // 새 탭으로 열면 현재 편집 화면은 유지됩니다.
              if (
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }

              if (
                hasUnsavedChanges &&
                !window.confirm(
                  "저장하지 않은 변경사항이 있습니다. 다중 공간 화면으로 이동할까요?",
                )
              ) {
                event.preventDefault();
              }
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:justify-start"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px] shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
            </svg>
            세대 타입·다중 공간
          </Link>
        </div>
      </nav>

      <div className="mt-auto hidden border-t border-slate-100 p-5 lg:block">
        <p className="text-xs font-medium text-slate-600">
          사용자 입력 기반 산출
        </p>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          시공 적합성 판정 기능은 제공하지 않습니다.
        </p>
      </div>
    </aside>
  );
}
