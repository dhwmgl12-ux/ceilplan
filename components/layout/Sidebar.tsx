export type SidebarMenu = "dashboard" | "projects" | "results";

interface SidebarProps {
  activeMenu: SidebarMenu;
  onNavigate: (menu: SidebarMenu) => void;
}

const menus: {
  id: SidebarMenu;
  label: string;
  path: string;
}[] = [
  {
    id: "dashboard",
    label: "대시보드",
    path: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  },
  {
    id: "projects",
    label: "프로젝트",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6",
  },
  {
    id: "results",
    label: "산출 결과",
    path: "M4 20h16M7 16v-5M12 16V6M17 16V3",
  },
];

export default function Sidebar({ activeMenu, onNavigate }: SidebarProps) {
  return (
    <aside className="border-b border-blue-100 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:w-48 lg:border-r">
      <div className="px-6 py-5 text-2xl font-bold tracking-tight">
        <span className="text-cyan-600">Ceil</span>
        <span className="text-slate-900">Plan</span>
      </div>

      <nav
        aria-label="메인 메뉴"
        className="grid grid-cols-3 gap-1 px-3 pb-3 lg:flex lg:flex-col"
      >
        {menus.map((menu) => {
          const selected = activeMenu === menu.id;

          return (
            <button
              key={menu.id}
              type="button"
              onClick={() => onNavigate(menu.id)}
              aria-current={selected ? "location" : undefined}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-3 text-xs font-semibold lg:justify-start lg:px-4 lg:text-sm ${
                selected
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={menu.path} />
              </svg>

              {menu.label}
            </button>
          );
        })}
      </nav>

      <p className="absolute bottom-6 left-6 hidden text-xs text-slate-400 lg:block">
        CeilPlan MVP
      </p>
    </aside>
  );
}
