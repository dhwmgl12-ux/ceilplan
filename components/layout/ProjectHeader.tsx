import type { ReactNode } from "react";

interface ProjectHeaderProps {
  projectName: string;
  areaM2: number | null;
  dirty: boolean;
  savedAt: string | null;
  children: ReactNode;
}

export default function ProjectHeader({
  projectName,
  areaM2,
  dirty,
  savedAt,
  children,
}: ProjectHeaderProps) {
  return (
    <header className="cp-project-header">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
          >
            C
          </span>

          <span className="text-lg font-bold tracking-tight text-slate-900">
            CeilPlan
          </span>
        </div>

        <div className="min-w-0 border-l border-slate-200 pl-4">
          <h1
            className="truncate text-sm font-semibold text-slate-900"
            title={projectName.trim() || "새 현장 프로젝트"}
          >
            {projectName.trim() || "새 현장 프로젝트"}
          </h1>

          <p className="mt-1 text-[11px] text-slate-500">
            {areaM2 === null
              ? "공간 치수 입력 대기"
              : `${areaM2.toLocaleString("ko-KR", {
                  maximumFractionDigits: 2,
                })} ㎡`}
            {" · M-BAR + 석고보드"}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p
          className={`text-xs font-medium ${
            dirty ? "text-amber-800" : "text-slate-600"
          }`}
        >
          {dirty
            ? "저장하지 않은 변경사항 있음"
            : savedAt
              ? "프로젝트 저장됨"
              : "새 프로젝트 · 아직 저장하지 않음"}
        </p>

        {savedAt && (
          <p className="mt-1 text-[11px] text-slate-500">
            마지막 저장{" "}
            {new Date(savedAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </p>
        )}
      </div>

      <div className="cp-project-actions">{children}</div>
    </header>
  );
}
