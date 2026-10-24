import type { ReactNode } from "react";

interface ProjectHeaderProps {
  projectName: string;
  areaM2: number | null;
  children: ReactNode;
}

export default function ProjectHeader({
  projectName,
  areaM2,
  children,
}: ProjectHeaderProps) {
  return (
    <header className="border-b border-blue-100 bg-white px-5 py-5 sm:px-6">
      <p className="mb-2 text-xs text-slate-500">프로젝트 / 천장 자재 산출</p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">
            {projectName.trim() || "새 현장 프로젝트"}
          </h1>

          <span className="shrink-0 rounded-md bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">
            MVP
          </span>
        </div>

        <dl className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <dt className="text-xs text-slate-500">공간 면적</dt>

            <dd className="mt-1 font-semibold">
              {areaM2 === null
                ? "입력 대기"
                : `${areaM2.toLocaleString("ko-KR", {
                    maximumFractionDigits: 2,
                  })} ㎡`}
            </dd>
          </div>

          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <dt className="text-xs text-slate-500">천장 방식</dt>

            <dd className="mt-1 font-semibold">M-BAR + 석고보드</dd>
          </div>
        </dl>
      </div>

      {children}
    </header>
  );
}
