import { useState } from "react";
import {
  featureColors,
  featureLabels,
  type CeilingFeature,
  type CeilingFeatureType,
} from "@/types/ceilplan";

import type { SiteInput } from "@/types/ceilplan";
import { tryGetRoomGeometry, isBoxInsideRoom } from "@/lib/geometry/room";

interface FeatureInputPanelProps {
  inputs: SiteInput;
  features: CeilingFeature[];
  onAdd: (feature: CeilingFeature) => void;
  onUpdate: (feature: CeilingFeature) => void;
  onDelete: (id: string) => void;
  activeFeatureId: string | null;
  onSelectFeature: (id: string | null) => void;
}

export default function FeatureInputPanel({
  inputs,
  features,
  onAdd,
  onUpdate,
  onDelete,
  activeFeatureId,
  onSelectFeature,
}: FeatureInputPanelProps) {
  const [type, setType] = useState<CeilingFeatureType>("AIR_CONDITIONER");

  const [draft, setDraft] = useState({
    xMm: "",
    yMm: "",
    widthMm: "",
    lengthMm: "",
  });

  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<CeilingFeature | null>(
    null,
  );

  function resetForm() {
    setEditingId(null);
    setType("AIR_CONDITIONER");
    setDraft({
      xMm: "",
      yMm: "",
      widthMm: "",
      lengthMm: "",
    });
    setError("");
    setEditingOriginal(null);
  }

  function startEditing(feature: CeilingFeature) {
    onSelectFeature(feature.id);
    setEditingId(feature.id);
    setType(feature.type);
    setDraft({
      xMm: String(feature.xMm),
      yMm: String(feature.yMm),
      widthMm: String(feature.widthMm),
      lengthMm: String(feature.lengthMm),
    });
    setError("");
    setEditingOriginal({ ...feature });
  }

  function handleSubmit() {
    const room = tryGetRoomGeometry(inputs);

    if (!room) {
      setError("먼저 공간 형태와 치수를 올바르게 입력하세요.");
      return;
    }

    if (
      editingId !== null &&
      !features.some((feature) => feature.id === editingId)
    ) {
      setError("수정 중인 요소가 삭제되었습니다. 수정 취소를 눌러주세요.");
      return;
    }

    if (editingId !== null && editingOriginal) {
      const current = features.find((feature) => feature.id === editingId);

      if (
        current &&
        JSON.stringify(current) !== JSON.stringify(editingOriginal)
      ) {
        setError(
          "수정 중 도면 이동 등으로 원본 요소가 변경되었습니다. 수정 취소 후 다시 수정 버튼을 눌러 최신 값을 불러오세요.",
        );
        return;
      }
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

    if (
      !isBoxInsideRoom(room, {
        x,
        y,
        width,
        length,
      })
    ) {
      setError(
        "요소가 공간 밖이나 제외 영역에 걸칩니다. 위치와 크기를 확인하세요.",
      );
      return;
    }

    const feature: CeilingFeature = {
      id: editingId ?? crypto.randomUUID(),
      type,
      xMm: x,
      yMm: y,
      widthMm: width,
      lengthMm: length,
    };

    if (editingId !== null) {
      onUpdate(feature);
    } else {
      onAdd(feature);
    }

    resetForm();
  }

  return (
    <section aria-labelledby="feature-input-title" className="p-5">
      <h2 id="feature-input-title" className="cp-title">
        현장 요소
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        위치는 공간 왼쪽 상단 기준입니다. 요소 크기로 자재를 자동 공제하거나
        보강하지 않습니다. 자재 증감은 현장 조정값에서 직접 입력하세요.
      </p>

      <label className="mt-4 block text-sm font-medium">
        요소 종류
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value as CeilingFeatureType)
          }
          className="cp-input mt-2"
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
              className="cp-input mt-2"
            />
          </label>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {editingId !== null && (
        <p role="status" className="mt-3 text-xs leading-5 text-blue-700">
          {features.findIndex((feature) => feature.id === editingId) + 1}번
          요소를 수정 중입니다. 수정 적용을 눌러야 반영됩니다. 다른 요소를
          선택해도 이 수정 폼의 대상은 바뀌지 않습니다.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="cp-button-primary flex-1"
        >
          {editingId !== null ? "요소 수정 적용" : "요소 추가"}
        </button>

        {editingId !== null && (
          <button
            type="button"
            onClick={resetForm}
            className="cp-button-secondary"
          >
            수정 취소
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {features.map((feature, index) => (
          <li
            key={feature.id}
            className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
              activeFeatureId === feature.id
                ? "border-blue-500 bg-blue-50"
                : "border-transparent bg-slate-50"
            }`}
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

            <div className="flex shrink-0 flex-col gap-2">
              <button
                id={`feature-select-${feature.id}`}
                type="button"
                onClick={() => onSelectFeature(feature.id)}
                aria-pressed={activeFeatureId === feature.id}
                aria-label={`${index + 1}번 ${featureLabels[feature.type]} 선택`}
                className="cp-button-secondary"
              >
                {activeFeatureId === feature.id ? "선택됨" : "선택"}
              </button>

              <button
                type="button"
                onClick={() => startEditing(feature)}
                disabled={editingId !== null && editingId !== feature.id}
                aria-label={`${index + 1}번 ${featureLabels[feature.type]} 수정`}
                className="cp-button-secondary disabled:opacity-50"
              >
                수정
              </button>

              <button
                type="button"
                onClick={() => onDelete(feature.id)}
                aria-label={`${index + 1}번 ${featureLabels[feature.type]} 삭제`}
                className="min-h-11 rounded px-3 py-2 text-xs text-red-700 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
