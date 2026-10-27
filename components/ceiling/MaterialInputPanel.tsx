import type { MaterialInput } from "@/types/ceilplan";
import NumberField from "@/components/ui/NumberField";

interface MaterialInputPanelProps {
  inputs: MaterialInput;
  onChange: (field: keyof MaterialInput, value: string) => void;
}

interface FieldDefinition {
  key: keyof MaterialInput;
  label: string;
  unit: string;
  min?: number;
  step?: number | "any";
}

const calculationGroups: {
  title: string;
  description?: string;
  fields: FieldDefinition[];
}[] = [
  {
    title: "골조 간격",
    fields: [
      {
        key: "mbarSpacingMm",
        label: "M-BAR",
        unit: "mm",
        step: 1,
      },
      {
        key: "carryingSpacingMm",
        label: "캐링채널",
        unit: "mm",
        step: 1,
      },
    ],
  },
  {
    title: "석고보드",
    fields: [
      {
        key: "boardWidthMm",
        label: "보드 가로",
        unit: "mm",
        step: 1,
      },
      {
        key: "boardLengthMm",
        label: "보드 세로",
        unit: "mm",
        step: 1,
      },
      {
        key: "layerCount",
        label: "겹수",
        unit: "겹",
        step: 1,
      },
    ],
  },
  {
    title: "구매 정척",
    description: "거래처에서 구매하는 1본의 길이입니다.",
    fields: [
      {
        key: "mbarStockLengthMm",
        label: "M-BAR",
        unit: "mm / 본",
        step: 1,
      },
      {
        key: "carryingStockLengthMm",
        label: "캐링채널",
        unit: "mm / 본",
        step: 1,
      },
    ],
  },
];

const lossFields: FieldDefinition[] = [
  {
    key: "boardLossPercent",
    label: "석고보드",
    unit: "%",
    min: 0,
    step: "any",
  },
  {
    key: "metalLossPercent",
    label: "금속 자재",
    unit: "%",
    min: 0,
    step: "any",
  },
];

const priceFields: FieldDefinition[] = [
  {
    key: "boardUnitPrice",
    label: "석고보드",
    unit: "원 / 장",
    min: 0,
    step: "any",
  },
  {
    key: "mbarUnitPrice",
    label: "M-BAR",
    unit: "원 / 본",
    min: 0,
    step: "any",
  },
  {
    key: "carryingUnitPrice",
    label: "캐링채널",
    unit: "원 / 본",
    min: 0,
    step: "any",
  },
];

export default function MaterialInputPanel({
  inputs,
  onChange,
}: MaterialInputPanelProps) {
  const enteredPriceCount = priceFields.filter(
    (field) => inputs[field.key].trim() !== "",
  ).length;

  function renderFields(fields: FieldDefinition[]) {
    return fields.map((field) => (
      <NumberField
        key={field.key}
        label={field.label}
        unit={field.unit}
        min={field.min}
        step={field.step}
        value={inputs[field.key]}
        onChange={(value) => onChange(field.key, value)}
      />
    ));
  }

  return (
    <div className="space-y-3">
      <section aria-labelledby="material-input-title" className="cp-card">
        <h2 id="material-input-title" className="cp-title">
          계산 조건
        </h2>

        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          간격과 규격은 현장 조건에 맞게 직접 입력하세요.
        </p>

        <div className="mt-4 space-y-5">
          {calculationGroups.map((group, index) => (
            <fieldset
              key={group.title}
              className={
                index === 0
                  ? "min-w-0"
                  : "min-w-0 border-t border-slate-100 pt-4"
              }
            >
              <legend className="mb-3 px-1 text-xs font-semibold text-slate-700">
                {group.title}
              </legend>

              <div className="grid grid-cols-2 gap-3">
                {renderFields(group.fields)}
              </div>

              {group.description && (
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {group.description}
                </p>
              )}
            </fieldset>
          ))}
        </div>
      </section>

      <section aria-labelledby="loss-title" className="cp-card">
        <div className="flex items-center justify-between gap-3">
          <h2 id="loss-title" className="cp-title">
            손실률 · Loss
          </h2>

          <span className="text-[11px] text-slate-500">발주 올림과 별도</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {renderFields(lossFields)}
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          손실을 적용하지 않으면 0을 입력하세요. 조정 후 물량에 적용하며, 구매
          단위 올림은 이후에 계산합니다.
        </p>
      </section>

      <details className="rounded-[var(--cp-radius-lg)] border border-[var(--cp-border)] bg-white">
        <summary className="cursor-pointer rounded-[var(--cp-radius-lg)] px-4 py-4 sm:px-5">
          <span className="text-[15px] font-bold tracking-tight text-slate-900">
            자재 단가
          </span>

          <span className="ml-2 text-[11px] text-slate-500">
            {enteredPriceCount} / {priceFields.length} 입력 · VAT 별도
          </span>
        </summary>

        <div className="border-t border-slate-100 p-4 sm:p-5">
          <div className="space-y-3">{renderFields(priceFields)}</div>

          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            단가 공란은 미입력으로 처리합니다. 0원을 입력한 경우와 구분합니다.
          </p>

          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            금속 자재 단가는 위에서 입력한 구매 정척 1본 기준입니다.
          </p>
        </div>
      </details>
    </div>
  );
}
