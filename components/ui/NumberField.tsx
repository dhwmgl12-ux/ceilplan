import { useId } from "react";

interface NumberFieldProps {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: number | "any";
  name?: string;
  error?: string;
  placeholder?: string;
}

export default function NumberField({
  label,
  unit,
  value,
  onChange,
  min = 1,
  step = "any",
  placeholder = "직접 입력",
  name,
  error,
}: NumberFieldProps) {
  const errorId = useId();

  return (
    <label className="block min-w-0">
      <span className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-xs font-medium text-slate-700">{label}</span>

        <span className="text-[11px] text-slate-500">{unit}</span>
      </span>

      <input
        type="number"
        inputMode={step === 1 ? "numeric" : "decimal"}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="cp-input tabular-nums"
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span
          id={errorId}
          className="mt-2 block text-xs leading-5 text-red-700"
        >
          {error}
        </span>
      )}
    </label>
  );
}
