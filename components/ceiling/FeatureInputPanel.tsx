import { useRef, useState } from "react";
import {
  featureColors,
  featureLabels,
  type CeilingFeature,
  type CeilingFeatureType,
} from "@/types/ceilplan";

import type { SiteInput } from "@/types/ceilplan";
import { tryGetRoomGeometry, isBoxInsideRoom } from "@/lib/geometry/room";
import PendingInputNotice from "@/components/ui/PendingInputNotice";

interface FeatureInputPanelProps {
  inputs: SiteInput;
  features: CeilingFeature[];
  onAdd: (feature: CeilingFeature) => void;
  onUpdate: (feature: CeilingFeature) => void;
  onDelete: (id: string) => void;
  activeFeatureId: string | null;
  onSelectFeature: (id: string | null) => void;
  onRequestPlacement: (type: CeilingFeatureType) => void;
}

export default function FeatureInputPanel({
  inputs,
  features,
  onAdd,
  onUpdate,
  onDelete,
  activeFeatureId,
  onSelectFeature,
  onRequestPlacement,
}: FeatureInputPanelProps) {
  const [type, setType] = useState<CeilingFeatureType>("AIR_CONDITIONER");
  const coordinateFormRef = useRef<HTMLDetailsElement>(null);

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

  const hasPendingInput = editingOriginal
    ? type !== editingOriginal.type ||
      draft.xMm !== String(editingOriginal.xMm) ||
      draft.yMm !== String(editingOriginal.yMm) ||
      draft.widthMm !== String(editingOriginal.widthMm) ||
      draft.lengthMm !== String(editingOriginal.lengthMm)
    : type !== "AIR_CONDITIONER" ||
      Object.values(draft).some((value) => value !== "");

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
    if (coordinateFormRef.current) {
      coordinateFormRef.current.open = true;

      coordinateFormRef.current.scrollIntoView({
        behavior: "auto",
        block: "nearest",
      });
    }
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
        요소 추가
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        종류를 선택한 뒤 캔버스에서 크기를 입력하고 배치하세요. 좌표를 직접
        입력하려면 아래 입력란을 펼치세요.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(featureLabels).map(([value, label]) => {
          const featureType = value as CeilingFeatureType;

          return (
            <button
              key={value}
              type="button"
              disabled={editingId !== null}
              onClick={() => onRequestPlacement(featureType)}
              className="flex min-h-14 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 border-2"
                style={{
                  borderColor: featureColors[featureType],
                  borderRadius: featureType === "SPRINKLER" ? "50%" : "3px",
                  borderStyle:
                    featureType === "INSPECTION_HATCH" ? "dashed" : "solid",
                }}
              />

              {label}
            </button>
          );
        })}
      </div>

      {editingId !== null && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          수정 적용 또는 취소 후 새 요소를 추가할 수 있습니다.
        </p>
      )}

      <PendingInputNotice visible={hasPendingInput} label="현장 요소 폼" />

      <p className="mt-2 text-xs leading-5 text-slate-500">
        위치는 공간 왼쪽 상단 기준입니다. 요소 크기로 자재를 자동 공제하거나
        보강하지 않습니다. 자재 증감은 현장 조정값에서 직접 입력하세요.
      </p>

      <details
        ref={coordinateFormRef}
        className="mt-4 rounded-lg border border-slate-200"
      >
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-slate-700">
          {editingId !== null ? "요소 좌표 수정" : "좌표로 요소 추가"}
        </summary>

        <div className="border-t border-slate-100 px-3 pb-3">
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
        </div>
      </details>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">요소 목록</h3>

          <span className="text-xs text-slate-500">총 {features.length}개</span>
        </div>

        {features.length === 0 ? (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-4">
            <p className="text-xs font-medium text-slate-700">
              등록된 요소가 없습니다.
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              위에서 종류를 선택하고 캔버스에 배치하거나, 좌표 입력란에서 위치와
              크기를 입력해 추가하세요.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {Object.entries(featureLabels).map(([value, label]) => {
              const featureType = value as CeilingFeatureType;
              const groupedFeatures = features.filter(
                (feature) => feature.type === featureType,
              );

              if (groupedFeatures.length === 0) return null;

              return (
                <details
                  key={value}
                  open
                  className="rounded-lg border border-slate-200"
                >
                  <summary className="cursor-pointer px-3 py-3 text-sm font-medium text-slate-700">
                    {label}

                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {groupedFeatures.length}개
                    </span>
                  </summary>

                  <ul className="space-y-1 border-t border-slate-100 p-2">
                    {groupedFeatures.map((feature) => {
                      const number =
                        features.findIndex((item) => item.id === feature.id) +
                        1;

                      const selected = activeFeatureId === feature.id;

                      return (
                        <li
                          key={feature.id}
                          className={`rounded-lg border ${
                            selected
                              ? "border-blue-300 bg-blue-50"
                              : "border-transparent bg-white"
                          }`}
                        >
                          <button
                            id={`feature-select-${feature.id}`}
                            type="button"
                            onClick={() => onSelectFeature(feature.id)}
                            aria-pressed={selected}
                            aria-label={`${number}번 ${label} 선택`}
                            className="flex w-full items-start gap-2 rounded-lg px-3 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-0.5 h-3 w-3 shrink-0 border-2"
                              style={{
                                borderColor: featureColors[feature.type],
                                borderRadius:
                                  feature.type === "SPRINKLER" ? "50%" : "2px",
                                borderStyle:
                                  feature.type === "INSPECTION_HATCH"
                                    ? "dashed"
                                    : "solid",
                              }}
                            />

                            <span className="min-w-0 flex-1">
                              <span
                                className={`block text-xs font-semibold ${
                                  selected ? "text-blue-700" : "text-slate-800"
                                }`}
                              >
                                {number}번 {label}
                              </span>

                              <span className="mt-1 block text-xs text-slate-500">
                                {feature.widthMm} × {feature.lengthMm} mm
                              </span>
                            </span>

                            {selected && (
                              <span className="shrink-0 text-xs font-medium text-blue-600">
                                선택됨
                              </span>
                            )}
                          </button>

                          {selected && (
                            <div className="border-t border-blue-100 px-3 pb-3 pt-2">
                              <p className="text-xs leading-5 text-slate-600">
                                X {feature.xMm}, Y {feature.yMm} mm
                              </p>

                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditing(feature)}
                                  disabled={
                                    editingId !== null &&
                                    editingId !== feature.id
                                  }
                                  className="cp-button-secondary flex-1 disabled:opacity-50"
                                >
                                  좌표 수정
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDelete(feature.id)}
                                  aria-label={`${number}번 ${label} 삭제`}
                                  className="min-h-11 rounded-lg px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
