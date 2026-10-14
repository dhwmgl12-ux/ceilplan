"use client";

import { useState } from "react";
import {
  featureLabels,
  type Adjustment,
  type AdjustmentType,
  type CeilingFeature,
  type MaterialId,
} from "@/types/ceilplan";

interface AdjustmentInputPanelProps {
  features: CeilingFeature[];
  adjustments: Adjustment[];
  onAdd: (adjustment: Adjustment) => void;
  onUpdate: (adjustment: Adjustment) => void;
  onDelete: (id: string) => void;
}

const materialLabels: Record<MaterialId, string> = {
  BOARD: "석고보드",
  MBAR: "M-BAR",
  CARRYING: "캐링채널",
};

export default function AdjustmentInputPanel({
  features,
  adjustments,
  onAdd,
  onUpdate,
  onDelete,
}: AdjustmentInputPanelProps) {
  const [featureId, setFeatureId] = useState("");
  const [materialId, setMaterialId] = useState<MaterialId>("BOARD");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("ADD");
  const [quantity, setQuantity] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setFeatureId("");
    setMaterialId("BOARD");
    setAdjustmentType("ADD");
    setQuantity("");
    setMemo("");
    setError("");
  }

  function startEditing(adjustment: Adjustment) {
    setEditingId(adjustment.id);
    setFeatureId(adjustment.featureId);
    setMaterialId(adjustment.materialId);
    setAdjustmentType(adjustment.adjustmentType);
    setQuantity(String(adjustment.quantity));
    setMemo(adjustment.memo);
    setError("");
  }

  // 선택했던 요소가 삭제됐으면 선택되지 않은 상태로 표시합니다.
  const selectedFeatureId = features.some((feature) => feature.id === featureId)
    ? featureId
    : "";

  const unit = materialId === "BOARD" ? "㎡" : "m";

  function handleSubmit() {
    setError("");

    if (
      editingId !== null &&
      !adjustments.some((adjustment) => adjustment.id === editingId)
    ) {
      setError("수정 중인 조정값이 삭제되었습니다. 수정 취소를 눌러주세요.");
      return;
    }

    if (!selectedFeatureId) {
      setError("연결할 현장 요소를 선택하세요.");
      return;
    }

    const value = Number(quantity);

    if (!quantity.trim() || !Number.isFinite(value) || value <= 0) {
      setError("수량은 0보다 큰 숫자로 입력하세요.");
      return;
    }

    if (!memo.trim()) {
      setError("조정 사유를 입력하세요.");
      return;
    }

    const common = {
      id: editingId ?? crypto.randomUUID(),
      featureId: selectedFeatureId,
      adjustmentType,
      quantity: value,
      memo: memo.trim(),
      sourceType: "USER_INPUT" as const,
      status: "INPUT_BASED" as const,
    };

    const adjustment: Adjustment =
      materialId === "BOARD"
        ? {
            ...common,
            materialId: "BOARD",
            unit: "㎡",
          }
        : {
            ...common,
            materialId,
            unit: "m",
          };

    if (editingId !== null) {
      onUpdate(adjustment);
    } else {
      onAdd(adjustment);
    }

    resetForm();
  }

  return (
    <section aria-labelledby="adjustment-title" className="cp-card">
      <h2 id="adjustment-title" className="cp-title">
        현장 조정값
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        현장 요소 때문에 발생하는 자재 증감을 직접 입력합니다. 자동 공제·보강
        기준은 적용하지 않습니다.
      </p>

      {features.length === 0 && (
        <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          먼저 현장 요소를 등록하세요.
        </p>
      )}

      <div className="mt-4 space-y-4">
        <label className="block text-sm font-medium">
          연결할 현장 요소
          <select
            value={selectedFeatureId}
            onChange={(event) => {
              setFeatureId(event.target.value);
              setError("");
            }}
            className="cp-input mt-2"
          >
            <option value="">요소 선택</option>

            {features.map((feature, index) => (
              <option key={feature.id} value={feature.id}>
                {index + 1}번 {featureLabels[feature.type]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            대상 자재
            <select
              value={materialId}
              onChange={(event) => {
                setMaterialId(event.target.value as MaterialId);

                // 자재 변경 시 단위가 바뀔 수 있으므로 다시 입력합니다.
                setQuantity("");
                setError("");
              }}
              className="cp-input mt-2"
            >
              <option value="BOARD">석고보드</option>
              <option value="MBAR">M-BAR</option>
              <option value="CARRYING">캐링채널</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            조정 방향
            <select
              value={adjustmentType}
              onChange={(event) =>
                setAdjustmentType(event.target.value as AdjustmentType)
              }
              className="cp-input mt-2"
            >
              <option value="ADD">추가</option>
              <option value="DEDUCT">공제</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium">
          수량 ({unit})
          <input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              setError("");
            }}
            placeholder="양수로 입력"
            className="cp-input mt-2"
          />
        </label>

        {materialId === "BOARD" && (
          <p className="text-xs leading-5 text-slate-500">
            공간 면적을 입력하세요. 계산 시 보드 규격과 현재 겹수를 적용합니다.
            겹수를 곱한 면적을 입력하지 마세요.
          </p>
        )}

        <label className="block text-sm font-medium">
          조정 사유
          <input
            type="text"
            value={memo}
            onChange={(event) => {
              setMemo(event.target.value);
              setError("");
            }}
            placeholder="예: 등박스 골조 추가"
            className="cp-input mt-2"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {editingId !== null && (
          <p role="status" className="text-xs leading-5 text-blue-700">
            선택한 조정값을 수정 중입니다. 수정 적용을 눌러야 계산 입력에
            반영됩니다.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={features.length === 0}
            className="cp-button-primary flex-1"
          >
            {editingId !== null ? "조정값 수정 적용" : "조정값 추가"}
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

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold">
          등록된 조정값 {adjustments.length}개
        </h3>

        {adjustments.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            등록된 조정값이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {adjustments.map((adjustment) => {
              const featureIndex = features.findIndex(
                (feature) => feature.id === adjustment.featureId,
              );
              const feature = features[featureIndex];

              return (
                <li key={adjustment.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {materialLabels[adjustment.materialId]}
                        {" · "}
                        {adjustment.adjustmentType === "ADD"
                          ? "추가"
                          : "공제"}{" "}
                        {adjustment.quantity.toLocaleString("ko-KR")}{" "}
                        {adjustment.unit}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {feature
                          ? `${featureIndex + 1}번 ${featureLabels[feature.type]}`
                          : "연결된 요소 없음"}
                      </p>

                      <p className="mt-2 break-words text-xs leading-5 text-slate-600">
                        {adjustment.memo}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        근거: 사용자 입력
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(adjustment)}
                        disabled={
                          editingId !== null && editingId !== adjustment.id
                        }
                        aria-label={`${materialLabels[adjustment.materialId]} 조정값 수정: ${adjustment.memo}`}
                        className="cp-button-secondary disabled:opacity-50"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(adjustment.id)}
                        aria-label={`${materialLabels[adjustment.materialId]} 조정값 삭제: ${adjustment.memo}`}
                        className="min-h-11 rounded px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
