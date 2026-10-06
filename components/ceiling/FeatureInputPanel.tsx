import { useState } from "react";
import {
  featureColors,
  featureLabels,
  type CeilingFeature,
  type CeilingFeatureType,
} from "@/types/ceilplan";

interface FeatureInputPanelProps {
  widthMm: string;
  lengthMm: string;
  features: CeilingFeature[];
  onAdd: (feature: CeilingFeature) => void;
  onDelete: (id: string) => void;
}

export default function FeatureInputPanel({
  widthMm,
  lengthMm,
  features,
  onAdd,
  onDelete,
}: FeatureInputPanelProps) {
  const [type, setType] = useState<CeilingFeatureType>("AIR_CONDITIONER");

  const [draft, setDraft] = useState({
    xMm: "",
    yMm: "",
    widthMm: "",
    lengthMm: "",
  });

  const [error, setError] = useState("");

  function handleAdd() {
    const roomWidth = Number(widthMm);
    const roomLength = Number(lengthMm);

    if (
      !Number.isFinite(roomWidth) ||
      !Number.isFinite(roomLength) ||
      roomWidth <= 0 ||
      roomLength <= 0
    ) {
      setError("먼저 공간 가로와 세로에 양수를 입력하세요.");
      return;
    }

    if (Object.values(draft).some((value) => !value.trim())) {
      setError("위치와 크기를 모두 입력하세요.");
      return;
    }

    const x = Number(draft.xMm);
    const y = Number(draft.yMm);
    const width = Number(draft.widthMm);
    const length = Number(draft.lengthMm);

    if (
      ![x, y, width, length].every(Number.isFinite) ||
      x < 0 ||
      y < 0 ||
      width <= 0 ||
      length <= 0
    ) {
      setError("위치는 0 이상, 크기는 0보다 큰 숫자로 입력하세요.");
      return;
    }

    if (x + width > roomWidth || y + length > roomLength) {
      setError("요소가 공간 밖으로 나갑니다. 위치와 크기를 확인하세요.");
      return;
    }

    onAdd({
      id: crypto.randomUUID(),
      type,
      xMm: x,
      yMm: y,
      widthMm: width,
      lengthMm: length,
    });

    setDraft({
      xMm: "",
      yMm: "",
      widthMm: "",
      lengthMm: "",
    });

    setError("");
  }

  return (
    <section
      aria-labelledby="feature-input-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 id="feature-input-title" className="text-lg font-bold">
        현장 요소
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        위치는 공간 왼쪽 상단 기준입니다. 요소별 공제·보강 계산은 아직 반영하지
        않습니다.
      </p>

      <label className="mt-4 block text-sm font-medium">
        요소 종류
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value as CeilingFeatureType)
          }
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          {Object.entries(featureLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(
          [
            ["xMm", "왼쪽에서 X"],
            ["yMm", "위쪽에서 Y"],
            ["widthMm", "요소 가로"],
            ["lengthMm", "요소 세로"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="block text-sm font-medium">
            {label} (mm)
            <input
              type="number"
              min={field === "xMm" || field === "yMm" ? 0 : 1}
              step="1"
              value={draft[field]}
              onChange={(event) => {
                const value = event.target.value;

                setDraft((previous) => ({
                  ...previous,
                  [field]: value,
                }));

                setError("");
              }}
              placeholder="직접 입력"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="mt-4 w-full rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
      >
        요소 추가
      </button>

      <ul className="mt-4 space-y-2">
        {features.map((feature, index) => (
          <li
            key={feature.id}
            className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3"
          >
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: featureColors[feature.type] }}
              >
                {index + 1}. {featureLabels[feature.type]}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                X {feature.xMm}, Y {feature.yMm} mm
                <br />
                {feature.widthMm} × {feature.lengthMm} mm
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDelete(feature.id)}
              aria-label={`${index + 1}번 ${featureLabels[feature.type]} 삭제`}
              className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
