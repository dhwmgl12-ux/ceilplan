import type { SiteInput } from "@/types/ceilplan";
import NumberField from "@/components/ui/NumberField";

interface InputPanelProps {
  inputs: SiteInput;
  nameLabel?: string;
  onChange: (field: keyof SiteInput, value: string) => void;
}

export default function InputPanel({
  inputs,
  onChange,
  nameLabel = "현장명",
}: InputPanelProps) {
  const shape = inputs.shape ?? "RECTANGLE";
  const hasCutout = shape === "L" || shape === "U";

  return (
    <section aria-labelledby="input-title" className="cp-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="input-title" className="cp-title">
          공간 설정
        </h2>

        <span className="text-[11px] text-slate-500">길이 단위 mm</span>
      </div>

      <div className="mt-4 space-y-5">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-slate-700">
            {nameLabel}
          </span>

          <input
            type="text"
            value={inputs.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder={
              nameLabel === "공간명" ? "예: 거실, 주방" : "예: 광주 상가 2층"
            }
            className="cp-input"
          />
        </label>

        <fieldset className="min-w-0 border-t border-slate-100 pt-4">
          <legend className="px-1 text-xs font-semibold text-slate-700">
            공간 형태
          </legend>

          <label className="mt-2 block">
            <span className="sr-only">공간 형태 선택</span>

            <select
              value={shape}
              onChange={(event) => onChange("shape", event.target.value)}
              aria-describedby="room-shape-help"
              className="cp-input"
            >
              <option value="RECTANGLE">직사각형</option>
              <option value="L">ㄱ자 · 왼쪽 아래 제외</option>
              <option value="U">ㄷ자 · 오른쪽 중간 제외</option>
            </select>
          </label>

          <p
            id="room-shape-help"
            className="mt-2 text-[11px] leading-5 text-slate-500"
          >
            {shape === "RECTANGLE"
              ? "가로·세로를 입력해 직사각형 공간을 만듭니다."
              : shape === "L"
                ? "전체 직사각형에서 왼쪽 아래 영역을 제외합니다."
                : "전체 직사각형에서 오른쪽 중간 영역을 제외합니다."}
          </p>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="mb-3 text-xs font-semibold text-slate-700">
            전체 바깥 치수
          </legend>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="전체 가로"
              unit="mm"
              step={1}
              value={inputs.widthMm}
              onChange={(value) => onChange("widthMm", value)}
            />

            <NumberField
              label="전체 세로"
              unit="mm"
              step={1}
              value={inputs.lengthMm}
              onChange={(value) => onChange("lengthMm", value)}
            />
          </div>

          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            공간 전체를 감싸는 직사각형의 가로·세로입니다.
          </p>
        </fieldset>

        {hasCutout && (
          <fieldset className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">
              천장이 없는 제외 영역
            </legend>

            <div className="mt-1 grid grid-cols-2 gap-3">
              <NumberField
                label="제외 가로"
                unit="mm"
                value={inputs.cutoutWidthMm ?? ""}
                onChange={(value) => onChange("cutoutWidthMm", value)}
              />

              <NumberField
                label="제외 세로"
                unit="mm"
                value={inputs.cutoutLengthMm ?? ""}
                onChange={(value) => onChange("cutoutLengthMm", value)}
              />

              {shape === "U" && (
                <div className="col-span-2">
                  <NumberField
                    label="위쪽에서 제외 영역까지"
                    unit="mm"
                    value={inputs.cutoutTopMm ?? ""}
                    onChange={(value) => onChange("cutoutTopMm", value)}
                  />
                </div>
              )}
            </div>

            <p className="mt-3 text-[11px] leading-5 text-slate-600">
              제외 영역은 공간 면적에 반영됩니다. 같은 영역을 현장 조정값에서
              다시 공제하지 마세요.
            </p>
          </fieldset>
        )}
      </div>
    </section>
  );
}
