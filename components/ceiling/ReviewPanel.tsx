import type { ReviewItem, ReviewLevel, ReviewTarget } from "@/lib/review";

interface ReviewPanelProps {
  items: ReviewItem[];
  onNavigate: (target: ReviewTarget) => void;
}

const groups: {
  level: ReviewLevel;
  label: string;
  className: string;
}[] = [
  {
    level: "ERROR",
    label: "오류",
    className: "border-red-200 bg-red-50 text-red-900",
  },
  {
    level: "CHECK",
    label: "확인 필요",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  {
    level: "INFO",
    label: "안내",
    className: "border-blue-100 bg-blue-50 text-blue-900",
  },
];

const targetLabels: Record<ReviewTarget, string> = {
  INPUTS: "입력 확인",
  FEATURES: "요소·조정값 확인",
  RESULTS: "결과 확인",
  SAVE: "저장 영역 이동",
};

export default function ReviewPanel({ items, onNavigate }: ReviewPanelProps) {
  const errorCount = items.filter((item) => item.level === "ERROR").length;

  const checkCount = items.filter((item) => item.level === "CHECK").length;

  return (
    <section aria-labelledby="review-title" className="cp-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="review-title" className="cp-title">
          검토할 항목
        </h2>

        <p className="text-xs text-slate-600">
          오류 {errorCount}개 · 확인 필요 {checkCount}개
        </p>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        현재 편집 중인 공간의 입력·결과·저장 상태입니다. 시공 기준 적합성이나
        안전성을 판정하는 기능은 아닙니다.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          현재 확인 패널에서 발견한 항목이 없습니다. 실제 발주 전 계산 근거와
          현장 조건을 검토하세요.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.map((group) => {
            const matchingItems = items.filter(
              (item) => item.level === group.level,
            );

            if (matchingItems.length === 0) return null;

            return (
              <details
                key={group.level}
                open
                className={`rounded-lg border p-3 ${group.className}`}
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  {group.label} {matchingItems.length}개
                </summary>

                <ul className="mt-3 space-y-3">
                  {matchingItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <p className="text-sm leading-6">{item.message}</p>

                      <button
                        type="button"
                        onClick={() => onNavigate(item.target)}
                        className="cp-button-secondary shrink-0 self-start"
                      >
                        {targetLabels[item.target]}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
