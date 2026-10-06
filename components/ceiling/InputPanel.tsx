import type { SiteInput } from "@/types/ceilplan";

interface InputPanelProps {
  inputs: SiteInput;
  onChange: (field: keyof SiteInput, value: string) => void;
}

export default function InputPanel({ inputs, onChange }: InputPanelProps) {
  return (
    <section
      aria-labelledby="input-title"
      className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 id="input-title" className="text-lg font-bold">
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
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
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
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <p className="text-xs leading-5 text-slate-500">
          직사각형 공간 1개 기준입니다. 치수는 mm로 입력하세요.
        </p>
      </div>
    </section>
  );
}
