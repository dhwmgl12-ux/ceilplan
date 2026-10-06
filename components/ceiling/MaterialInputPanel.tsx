import type { MaterialInput } from "@/types/ceilplan";

interface MaterialInputPanelProps {
  inputs: MaterialInput;
  onChange: (field: keyof MaterialInput, value: string) => void;
}

interface NumberFieldProps {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: number | "any";
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  min = 1,
  step = 1,
}: NumberFieldProps) {
  return (
    <label className="block text-sm font-medium">
      {label}

      <div className="mt-2 flex items-center rounded-lg border border-slate-200">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="직접 입력"
          className="min-w-0 w-full rounded-lg px-3 py-2 text-sm"
        />

        <span className="shrink-0 pr-3 text-xs text-slate-500">{unit}</span>
      </div>
    </label>
  );
}

export default function MaterialInputPanel({
  inputs,
  onChange,
}: MaterialInputPanelProps) {
  return (
    <section
      aria-labelledby="material-input-title"
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 id="material-input-title" className="text-lg font-bold">
        자재 계산 조건
      </h2>

      <div className="mt-5 space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">골조 간격</legend>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="M-BAR 간격"
              unit="mm"
              value={inputs.mbarSpacingMm}
              onChange={(value) => onChange("mbarSpacingMm", value)}
            />

            <NumberField
              label="캐링 간격"
              unit="mm"
              value={inputs.carryingSpacingMm}
              onChange={(value) => onChange("carryingSpacingMm", value)}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold">석고보드 규격</legend>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="보드 가로"
              unit="mm"
              value={inputs.boardWidthMm}
              onChange={(value) => onChange("boardWidthMm", value)}
            />

            <NumberField
              label="보드 세로"
              unit="mm"
              value={inputs.boardLengthMm}
              onChange={(value) => onChange("boardLengthMm", value)}
            />

            <NumberField
              label="겹수"
              unit="겹"
              value={inputs.layerCount}
              onChange={(value) => onChange("layerCount", value)}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Loss</legend>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="석고보드 Loss"
              unit="%"
              min={0}
              step="any"
              value={inputs.boardLossPercent}
              onChange={(value) => onChange("boardLossPercent", value)}
            />

            <NumberField
              label="금속 자재 Loss"
              unit="%"
              min={0}
              step="any"
              value={inputs.metalLossPercent}
              onChange={(value) => onChange("metalLossPercent", value)}
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Loss가 없으면 0을 입력하세요. 발주 올림분과 별도로 계산합니다.
          </p>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold">구매 정척 길이</legend>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="M-BAR"
              unit="mm / 본"
              value={inputs.mbarStockLengthMm}
              onChange={(value) => onChange("mbarStockLengthMm", value)}
            />

            <NumberField
              label="캐링채널"
              unit="mm / 본"
              value={inputs.carryingStockLengthMm}
              onChange={(value) => onChange("carryingStockLengthMm", value)}
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            거래처에서 구매하는 자재 1본의 길이를 입력하세요.
          </p>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold">
            자재 단가 · VAT 별도
          </legend>

          <div className="space-y-3">
            <NumberField
              label="석고보드"
              unit="원 / 장"
              min={0}
              step="any"
              value={inputs.boardUnitPrice}
              onChange={(value) => onChange("boardUnitPrice", value)}
            />

            <NumberField
              label="M-BAR"
              unit="원 / 본"
              min={0}
              step="any"
              value={inputs.mbarUnitPrice}
              onChange={(value) => onChange("mbarUnitPrice", value)}
            />

            <NumberField
              label="캐링채널"
              unit="원 / 본"
              min={0}
              step="any"
              value={inputs.carryingUnitPrice}
              onChange={(value) => onChange("carryingUnitPrice", value)}
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            단가를 비워두면 단가 미입력으로 처리합니다. M-BAR와 캐링채널 단가는
            위에 입력한 정척 1본 기준입니다.
          </p>
        </fieldset>
      </div>
    </section>
  );
}
