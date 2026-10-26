import type { ReactNode } from "react";

interface ProjectHeaderProps {
  projectName: string;
  areaM2: number | null;
  dirty: boolean;
  children: ReactNode;
}

export default function ProjectHeader({
  projectName,
  areaM2,
  dirty,
  children,
}: ProjectHeaderProps) {
  return (
    <header className="border-b border-[var(--cp-border)] bg-white">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium tracking-wide text-slate-500">
              작업 공간 / 단일 공간
            </p>

            <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-900">
              {projectName.trim() || "새 현장 프로젝트"}
            </h1>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
              dirty
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                dirty ? "bg-amber-500" : "bg-slate-400"
              }`}
            />

            {dirty ? "미저장 변경사항" : "미저장 변경사항 없음"}
          </span>
        </div>

        <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <dt className="text-slate-500">공간 면적</dt>
            <dd className="font-semibold tabular-nums text-slate-800">
              {areaM2 === null
                ? "입력 대기"
                : `${areaM2.toLocaleString("ko-KR", {
                    maximumFractionDigits: 2,
                  })} ㎡`}
            </dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="text-slate-500">천장 방식</dt>
            <dd className="font-medium text-slate-800">M-BAR + 석고보드</dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="text-slate-500">저장 위치</dt>
            <dd className="text-slate-700">현재 브라우저</dd>
          </div>
        </dl>
      </div>

      {children}
    </header>
  );
}
