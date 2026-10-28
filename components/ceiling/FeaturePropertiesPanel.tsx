"use client";

import { useState } from "react";
import NumberField from "@/components/ui/NumberField";
import {
  featureLabels,
  type Adjustment,
  type CeilingFeature,
  type CeilingFeatureType,
  type SiteInput,
} from "@/types/ceilplan";
import { isBoxInsideRoom, tryGetRoomGeometry } from "@/lib/geometry/room";
import PendingInputNotice from "@/components/ui/PendingInputNotice";

interface FeaturePropertiesPanelProps {
  inputs: SiteInput;
  features: CeilingFeature[];
  adjustments: Adjustment[];
  activeFeatureId: string | null;
  onUpdate: (feature: CeilingFeature) => void;
  onClearSelection: () => void;
  onShowInList: () => void;
  onShowAdjustments: () => void;
}

interface PropertyValues {
  type: CeilingFeatureType;
  xMm: string;
  yMm: string;
  widthMm: string;
  lengthMm: string;
}

interface PropertyDraft {
  original: CeilingFeature;
  values: PropertyValues;
}

function toValues(feature: CeilingFeature): PropertyValues {
  return {
    type: feature.type,
    xMm: String(feature.xMm),
    yMm: String(feature.yMm),
    widthMm: String(feature.widthMm),
    lengthMm: String(feature.lengthMm),
  };
}

const numberFields = [
  ["xMm", "왼쪽에서 X", 0],
  ["yMm", "위쪽에서 Y", 0],
  ["widthMm", "가로", 1],
  ["lengthMm", "세로", 1],
] as const;

export default function FeaturePropertiesPanel({
  inputs,
  features,
  adjustments,
  activeFeatureId,
  onUpdate,
  onClearSelection,
  onShowInList,
  onShowAdjustments,
}: FeaturePropertiesPanelProps) {
  // 요소마다 작성 중인 입력을 별도로 보관합니다.
  const [drafts, setDrafts] = useState(() => new Map<string, PropertyDraft>());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const feature = features.find((item) => item.id === activeFeatureId);

  const draft = feature ? drafts.get(feature.id) : undefined;
  const values = feature ? (draft?.values ?? toValues(feature)) : null;

  const changed = Boolean(
    feature &&
    values &&
    JSON.stringify(values) !== JSON.stringify(toValues(feature)),
  );

  const conflict = Boolean(
    feature &&
    draft &&
    JSON.stringify(feature) !== JSON.stringify(draft.original),
  );

  const linkedAdjustments = adjustments.filter(
    (item) => item.featureId === feature?.id,
  );

  const pendingFeatureCount = Array.from(drafts.entries()).filter(
    ([id, item]) =>
      features.some((current) => current.id === id) &&
      JSON.stringify(item.values) !== JSON.stringify(toValues(item.original)),
  ).length;

  function changeField<K extends keyof PropertyValues>(
    field: K,
    value: PropertyValues[K],
  ) {
    if (!feature) return;

    setDrafts((previous) => {
      const next = new Map(previous);
      const existing = previous.get(feature.id);

      next.set(feature.id, {
        original: existing?.original ?? { ...feature },
        values: {
          ...(existing?.values ?? toValues(feature)),
          [field]: value,
        },
      });

      return next;
    });

    setError("");
    setNotice("");
  }

  function resetCurrent() {
    if (!feature) return;

    setDrafts((previous) => {
      const next = new Map(previous);
      next.delete(feature.id);
      return next;
    });

    setError("");
    setNotice("현재 요소의 최신 속성을 불러왔습니다.");
  }

  function apply() {
    setError("");
    setNotice("");

    if (!feature || !values) return;

    if (conflict) {
      setError(
        "도면 이동이나 다른 수정으로 원본이 변경되었습니다. 최신 값으로 되돌린 뒤 다시 입력하세요.",
      );
      return;
    }

    const room = tryGetRoomGeometry(inputs);

    if (!room) {
      setError("공간 형태와 치수를 먼저 확인하세요.");
      return;
    }

    if (
      [values.xMm, values.yMm, values.widthMm, values.lengthMm].some(
        (value) => !value.trim(),
      )
    ) {
      setError("위치와 크기를 모두 입력하세요.");
      return;
    }

    const nextFeature: CeilingFeature = {
      id: feature.id,
      type: values.type,
      xMm: Number(values.xMm),
      yMm: Number(values.yMm),
      widthMm: Number(values.widthMm),
      lengthMm: Number(values.lengthMm),
    };

    if (
      !isBoxInsideRoom(room, {
        x: nextFeature.xMm,
        y: nextFeature.yMm,
        width: nextFeature.widthMm,
        length: nextFeature.lengthMm,
      })
    ) {
      setError(
        "위치는 0 이상, 크기는 0보다 커야 하며 공간 밖이나 제외 영역에 걸칠 수 없습니다.",
      );
      return;
    }

    onUpdate(nextFeature);

    setDrafts((previous) => {
      const next = new Map(previous);
      next.delete(feature.id);
      return next;
    });

    setNotice("요소 속성을 적용했습니다. 계산 결과는 다시 확인하세요.");
  }

  if (!feature || !values) {
    return (
      <section aria-labelledby="feature-properties-title" className="cp-card">
        <h2 id="feature-properties-title" className="cp-title">
          요소 속성
        </h2>
        <PendingInputNotice
          visible={pendingFeatureCount > 0}
          label={`요소 속성 ${pendingFeatureCount}개`}
        />

        <p className="mt-2 text-xs leading-6 text-slate-500">
          도면이나 요소 목록에서 항목을 선택하면 위치·크기와 연결된 조정값을
          확인할 수 있습니다.
        </p>
      </section>
    );
  }

  const featureNumber =
    features.findIndex((item) => item.id === feature.id) + 1;

  return (
    <section aria-labelledby="feature-properties-title" className="cp-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="feature-properties-title" className="cp-title">
            요소 속성
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {featureNumber}번 · {featureLabels[feature.type]}
          </p>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="cp-button-secondary"
        >
          선택 해제
        </button>
      </div>

      <PendingInputNotice
        visible={pendingFeatureCount > 0}
        label={`요소 속성 ${pendingFeatureCount}개`}
      />

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-medium text-slate-700">
          요소 종류
        </span>

        <select
          value={values.type}
          onChange={(event) =>
            changeField("type", event.target.value as CeilingFeatureType)
          }
          className="cp-input"
        >
          {Object.entries(featureLabels).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {numberFields.map(([field, label, min]) => (
          <NumberField
            key={field}
            label={label}
            unit="mm"
            min={min}
            step="any"
            value={values[field]}
            onChange={(value) => changeField(field, value)}
          />
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        위치는 공간 왼쪽 위 기준입니다. 입력값은 수정 적용을 눌러야 도면에
        반영됩니다. 요소별 미적용 입력은 선택을 바꿔도 유지됩니다.
      </p>

      {conflict && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          수정 중 원본 요소가 변경되었습니다. 최신 값으로 되돌린 뒤 다시
          수정하세요.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={!changed || conflict}
          className="cp-button-primary"
        >
          수정 적용
        </button>

        <button
          type="button"
          onClick={resetCurrent}
          disabled={!draft}
          className="cp-button-secondary"
        >
          최신 값으로 되돌리기
        </button>

        <button
          type="button"
          onClick={onShowInList}
          className="cp-button-secondary"
        >
          목록에서 보기
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p role="status" className="mt-2 text-xs text-blue-700">
        {notice}
      </p>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-700">
            연결된 조정값 {linkedAdjustments.length}개
          </h3>

          <button
            type="button"
            onClick={onShowAdjustments}
            className="cp-button-secondary"
          >
            조정값 입력·수정
          </button>
        </div>

        {linkedAdjustments.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            연결된 조정값이 없습니다. 필요한 자재 증감이 있을 때 직접
            입력하세요.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {linkedAdjustments.map((item) => (
              <li
                key={item.id}
                className="rounded-md bg-slate-50 p-3 text-xs leading-5"
              >
                <p className="font-medium text-slate-700">
                  {item.materialId === "BOARD"
                    ? "석고보드"
                    : item.materialId === "MBAR"
                      ? "M-BAR"
                      : "캐링채널"}
                  {" · "}
                  {item.adjustmentType === "ADD" ? "추가" : "공제"}{" "}
                  {item.quantity} {item.unit}
                </p>

                <p className="mt-1 break-words text-slate-500">{item.memo}</p>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          요소의 크기나 종류를 바꿔도 조정 수량은 자동 변경되지 않습니다. 기존
          조정값을 함께 검토하세요.
        </p>
      </div>
    </section>
  );
}
