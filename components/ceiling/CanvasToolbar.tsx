import NumberField from "@/components/ui/NumberField";
import { featureLabels, type CeilingFeatureType } from "@/types/ceilplan";
import type { FeaturePointerMode } from "@/hooks/useFeaturePointer";

interface CanvasToolbarProps {
  mode: FeaturePointerMode;
  onModeChange: (mode: FeaturePointerMode) => void;

  placementType: CeilingFeatureType;
  onTypeChange: (type: CeilingFeatureType) => void;

  placementWidth: string;
  onWidthChange: (value: string) => void;

  placementLength: string;
  onLengthChange: (value: string) => void;

  isValid: boolean;
  message: string;
}

const tools: {
  mode: FeaturePointerMode;
  label: string;
  description: string;
  path: string;
}[] = [
  {
    mode: "VIEW",
    label: "선택",
    description: "요소를 선택하고 정보를 확인합니다.",
    path: "M5 3v17l4-5 5 6 3-2-5-6 7-1L5 3Z",
  },
  {
    mode: "PLACE",
    label: "배치",
    description: "크기를 입력하고 도면에 요소를 배치합니다.",
    path: "M12 4v16M4 12h16",
  },
  {
    mode: "MOVE",
    label: "이동",
    description: "요소를 끌어서 위치를 변경합니다.",
    path: "M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3",
  },
];

export default function CanvasToolbar({
  mode,
  onModeChange,
  placementType,
  onTypeChange,
  placementWidth,
  onWidthChange,
  placementLength,
  onLengthChange,
  isValid,
  message,
}: CanvasToolbarProps) {
  const help =
    mode === "VIEW"
      ? "요소를 클릭·터치해서 선택하세요."
      : mode === "PLACE"
        ? "도면을 짧게 클릭·터치하세요. 선택한 지점이 요소 중심입니다."
        : "요소를 누른 채 끌어서 이동하세요.";

  return (
    <div className="cp-canvas-tools">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="캔버스 작업 모드"
          className="flex flex-wrap gap-1"
        >
          {tools.map((tool) => {
            const selected = mode === tool.mode;

            return (
              <button
                key={tool.mode}
                type="button"
                onClick={() => onModeChange(tool.mode)}
                disabled={!isValid && tool.mode !== "VIEW"}
                aria-pressed={selected}
                title={tool.description}
                className={`cp-button-secondary ${
                  selected ? "!border-blue-500 !bg-blue-50 !text-blue-700" : ""
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={tool.path} />
                </svg>

                {tool.label}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-slate-500">실제 치수 단위 mm</span>
      </div>

      {mode === "PLACE" && (
        <fieldset className="mt-3 min-w-0 border-t border-slate-100 pt-3">
          <legend className="sr-only">새 요소 배치 설정</legend>

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block min-w-0">
              <span className="mb-2 block text-xs font-medium text-slate-700">
                배치할 요소
              </span>

              <select
                value={placementType}
                onChange={(event) =>
                  onTypeChange(event.target.value as CeilingFeatureType)
                }
                className="cp-input"
              >
                {Object.entries(featureLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <NumberField
              label="가로"
              unit="mm"
              step={1}
              value={placementWidth}
              onChange={onWidthChange}
            />

            <NumberField
              label="세로"
              unit="mm"
              step={1}
              value={placementLength}
              onChange={onLengthChange}
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            입력한 크기로 배치합니다. 클릭한 지점은 요소의 중심이며, 오른쪽
            속성의 X·Y는 요소 왼쪽 위 좌표입니다. 같은 크기를 반복 배치할 수
            있고, 완료하려면 선택 도구를 누르세요.
          </p>
        </fieldset>
      )}

      <p
        id="preview-pointer-help"
        className="mt-3 text-[11px] leading-5 text-slate-600"
      >
        {!isValid
          ? "공간 형태와 치수를 입력하면 배치·이동을 사용할 수 있습니다."
          : help}
      </p>

      <details className="mt-1 text-[11px] text-slate-500">
        <summary className="cursor-pointer py-1">조작 안내</summary>

        <ul className="mt-1 list-disc space-y-1 pl-4 leading-5">
          <li>선택 모드에서는 도형을 클릭하거나 터치해 선택합니다.</li>
          <li>
            키보드로 도형에 이동한 뒤 Enter 또는 Space로 선택할 수 있습니다.
          </li>
          <li>배치 모드에서는 크기를 입력하고 도면을 짧게 누릅니다.</li>
          <li>
            이동 모드에서는 요소를 끌어 놓습니다. 공간 밖이나 제외 영역에는
            배치할 수 없습니다.
          </li>
          <li>
            캔버스에 포커스가 있을 때 Escape를 누르면 임시 작업을 취소하고 선택
            모드로 돌아갑니다.
          </li>
        </ul>
      </details>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-1 min-h-5 text-xs leading-5 text-blue-700"
      >
        {message}
      </p>
    </div>
  );
}
