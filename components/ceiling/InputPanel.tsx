import type { SiteInput } from "@/types/ceilplan";

interface InputPanelProps {
  inputs: SiteInput;
  onChange: (field: keyof SiteInput, value: string) => void;
}

export default function InputPanel({ inputs, onChange }: InputPanelProps) {
  return (
    <section aria-labelledby="input-title" className="cp-card min-h-80">
      <h2 id="input-title" className="cp-title">
        현장 기본 정보
      </h2>

      <div className="mt-5 space-y-4">
        <label className="block text-sm font-medium">
          현장명
          <input
            type="text"
            value={inputs.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="예: 광주 상가 2층"
            className="cp-input mt-2"
          />
        </label>

        <label className="block text-sm font-medium">
          공간 형태
          <select
            value={inputs.shape ?? "RECTANGLE"}
            onChange={(event) => onChange("shape", event.target.value)}
            className="cp-input mt-2"
          >
            <option value="RECTANGLE">직사각형</option>
            <option value="L">ㄱ자 · 왼쪽 아래 제외</option>
            <option value="U">ㄷ자 · 오른쪽 중간 제외</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            공간 가로 (mm)
            <input
              type="number"
              min="1"
              step="1"
              value={inputs.widthMm}
              onChange={(event) => onChange("widthMm", event.target.value)}
              placeholder="가로 입력"
              className="cp-input mt-2"
            />
          </label>

          <label className="block text-sm font-medium">
            공간 세로 (mm)
            <input
              type="number"
              min="1"
              step="1"
              value={inputs.lengthMm}
              onChange={(event) => onChange("lengthMm", event.target.value)}
              placeholder="세로 입력"
              className="cp-input mt-2"
            />
          </label>

          {inputs.shape && inputs.shape !== "RECTANGLE" && (
            <fieldset className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <legend className="px-1 text-sm font-semibold">
                천장이 없는 제외 영역
              </legend>

              <p className="mb-3 text-xs leading-5 text-slate-600">
                {inputs.shape === "L"
                  ? "전체 공간의 왼쪽 아래에서 제외할 크기를 입력하세요."
                  : "전체 공간의 오른쪽 중간에서 제외할 크기와 위쪽 거리를 입력하세요."}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  제외 가로 (mm)
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={inputs.cutoutWidthMm ?? ""}
                    onChange={(event) =>
                      onChange("cutoutWidthMm", event.target.value)
                    }
                    className="cp-input mt-2"
                  />
                </label>

                <label className="block text-sm font-medium">
                  제외 세로 (mm)
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={inputs.cutoutLengthMm ?? ""}
                    onChange={(event) =>
                      onChange("cutoutLengthMm", event.target.value)
                    }
                    className="cp-input mt-2"
                  />
                </label>

                {inputs.shape === "U" && (
                  <label className="col-span-2 block text-sm font-medium">
                    전체 위쪽에서 제외 영역까지 (mm)
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={inputs.cutoutTopMm ?? ""}
                      onChange={(event) =>
                        onChange("cutoutTopMm", event.target.value)
                      }
                      className="cp-input mt-2"
                    />
                  </label>
                )}
              </div>
            </fieldset>
          )}
        </div>

        <p className="text-xs leading-5 text-slate-500">
          치수는 mm로 입력하세요. 전체 가로·세로는 공간을 감싸는 바깥
          치수입니다. 제외 영역은 면적에 이미 반영되므로 현장 조정값에서 다시
          공제하지 마세요.
        </p>
      </div>
    </section>
  );
}
