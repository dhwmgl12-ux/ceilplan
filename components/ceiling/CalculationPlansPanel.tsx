"use client";

import { useState } from "react";
import type {
  CalculationSnapshot,
  MaterialInput,
  SiteInput,
} from "@/types/ceilplan";
import {
  compareCalculationPlans,
  deleteCalculationPlan,
  nullableDifference,
  readCalculationPlans,
  saveCalculationPlan,
  type CalculationPlan,
} from "@/lib/calculation-plans";

interface CalculationPlansPanelProps {
  snapshot: CalculationSnapshot | null;
  stale: boolean;
}

const siteFields: {
  key: keyof SiteInput;
  label: string;
}[] = [
  { key: "name", label: "현장·공간명" },
  { key: "shape", label: "공간 형태" },
  { key: "widthMm", label: "전체 가로 (mm)" },
  { key: "lengthMm", label: "전체 세로 (mm)" },
  { key: "cutoutWidthMm", label: "제외 가로 (mm)" },
  { key: "cutoutLengthMm", label: "제외 세로 (mm)" },
  { key: "cutoutTopMm", label: "제외 위쪽 거리 (mm)" },
];

const materialFields: {
  key: keyof MaterialInput;
  label: string;
}[] = [
  { key: "mbarSpacingMm", label: "M-BAR 간격 (mm)" },
  { key: "carryingSpacingMm", label: "캐링 간격 (mm)" },
  { key: "boardWidthMm", label: "보드 가로 (mm)" },
  { key: "boardLengthMm", label: "보드 세로 (mm)" },
  { key: "layerCount", label: "보드 겹수" },
  { key: "boardLossPercent", label: "보드 Loss (%)" },
  { key: "metalLossPercent", label: "금속 Loss (%)" },
  { key: "mbarStockLengthMm", label: "M-BAR 정척 (mm)" },
  { key: "carryingStockLengthMm", label: "캐링 정척 (mm)" },
  { key: "boardUnitPrice", label: "보드 단가 (원/장)" },
  { key: "mbarUnitPrice", label: "M-BAR 단가 (원/본)" },
  { key: "carryingUnitPrice", label: "캐링 단가 (원/본)" },
];

function number(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 3,
  });
}

function money(value: number | null) {
  return value === null ? "단가 미입력" : `${number(value)}원`;
}

function difference(value: number | null, unit: string) {
  if (value === null) return "비교 불가";
  if (value === 0) return `0${unit}`;

  return `${value > 0 ? "+" : ""}${number(value)}${unit}`;
}

function displayInput(value: string | undefined) {
  if (value === "RECTANGLE") return "직사각형";
  if (value === "L") return "ㄱ자";
  if (value === "U") return "ㄷ자";

  return value?.trim() || "미입력";
}

export default function CalculationPlansPanel({
  snapshot,
  stale,
}: CalculationPlansPanelProps) {
  const [name, setName] = useState("");
  const [plans, setPlans] = useState<CalculationPlan[]>([]);
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const before = plans.find((plan) => plan.id === beforeId);
  const after = plans.find((plan) => plan.id === afterId);

  const canCompare = Boolean(before && after && before.id !== after.id);

  const comparison =
    canCompare && before && after
      ? compareCalculationPlans(before.snapshot, after.snapshot)
      : [];

  const totalDifference =
    canCompare && before && after
      ? nullableDifference(
          before.snapshot.result.totalEstimatedCost,
          after.snapshot.result.totalEstimatedCost,
        )
      : null;

  function run(action: () => string) {
    setError("");
    setNotice("");

    try {
      setNotice(action());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "계산안을 처리하지 못했습니다.",
      );
    }
  }

  function save() {
    run(() => {
      if (!snapshot || stale) {
        throw new Error("현재 입력을 다시 계산한 뒤 저장하세요.");
      }

      if (!name.trim()) {
        throw new Error("계산안 이름을 입력하세요.");
      }

      const plan: CalculationPlan = {
        id: crypto.randomUUID(),
        name: name.trim(),
        savedAt: new Date().toISOString(),
        snapshot: structuredClone(snapshot),
      };

      const next = saveCalculationPlan(plan);

      setPlans(next);
      setAfterId(plan.id);
      setName("");

      return "현재 계산 결과를 계산안으로 저장했습니다.";
    });
  }

  function load() {
    run(() => {
      const next = readCalculationPlans();

      setPlans(next);
      setBeforeId("");
      setAfterId("");

      return next.length
        ? `계산안 ${next.length}개를 불러왔습니다.`
        : "저장된 계산안이 없습니다.";
    });
  }

  function remove(id: string) {
    if (!window.confirm("이 계산안을 삭제할까요? 현재 입력은 유지됩니다.")) {
      return;
    }

    run(() => {
      setPlans(deleteCalculationPlan(id));

      if (beforeId === id) setBeforeId("");
      if (afterId === id) setAfterId("");

      return "계산안을 삭제했습니다.";
    });
  }

  return (
    <section aria-labelledby="calculation-plans-title" className="cp-card">
      <h2 id="calculation-plans-title" className="cp-title">
        계산안 저장·비교
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        공간 한 개의 계산 당시 입력과 결과를 보관합니다. 계산안 목록은 이
        브라우저에 별도로 저장되며, 프로젝트 JSON에는 포함되지 않습니다.
      </p>

      <label className="mt-4 block text-sm font-medium">
        계산안 이름
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 거실 기존안, 거실 변경안"
          className="cp-input mt-2"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!snapshot || stale}
          className="cp-button-primary disabled:opacity-50"
        >
          현재 결과를 계산안으로 저장
        </button>

        <button type="button" onClick={load} className="cp-button-secondary">
          저장한 계산안 불러오기
        </button>
      </div>

      {(!snapshot || stale) && (
        <p className="mt-2 text-xs text-amber-800">
          현재 입력을 계산한 뒤 계산안을 저장할 수 있습니다.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-3 text-sm text-blue-700">
          {notice}
        </p>
      )}

      {plans.length > 0 && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "변경 전 계산안",
                value: beforeId,
                onChange: setBeforeId,
              },
              {
                label: "변경 후 계산안",
                value: afterId,
                onChange: setAfterId,
              },
            ].map((field) => (
              <label key={field.label} className="block text-sm font-medium">
                {field.label}
                <select
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className="cp-input mt-2"
                >
                  <option value="">선택하세요</option>

                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {plan.snapshot.siteInput.name}
                      {" · "}
                      {new Date(plan.savedAt).toLocaleString("ko-KR")}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {beforeId && beforeId === afterId && (
            <p className="mt-3 text-sm text-amber-800">
              서로 다른 계산안을 선택하세요.
            </p>
          )}
        </>
      )}

      {canCompare && before && after && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-6 text-slate-700">
            {before.name} → {after.name}
            <br />
            증감은 변경 후에서 변경 전을 뺀 값입니다. 서로 같은 비교 대상
            공간인지 확인하세요.
          </p>

          {before.snapshot.calculationRuleVersion !==
            after.snapshot.calculationRuleVersion && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              계산 정책 버전이 다릅니다. 차이에 입력 변경뿐 아니라 계산 정책
              변경의 영향이 포함될 수 있습니다.
            </p>
          )}

          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-semibold">예상 금액 비교</p>
            <p className="mt-2 text-sm">
              {money(before.snapshot.result.totalEstimatedCost)}
              {" → "}
              {money(after.snapshot.result.totalEstimatedCost)}
            </p>
            <p className="mt-2 text-lg font-bold text-teal-800">
              증감 {difference(totalDifference, "원")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <caption className="sr-only">
                자재별 발주 수량과 금액의 변경 전후 비교
              </caption>

              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="p-2">
                    자재
                  </th>
                  <th scope="col" className="p-2">
                    변경 전
                  </th>
                  <th scope="col" className="p-2">
                    변경 후
                  </th>
                  <th scope="col" className="p-2">
                    수량 증감
                  </th>
                  <th scope="col" className="p-2">
                    금액 증감
                  </th>
                </tr>
              </thead>

              <tbody>
                {comparison.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <th scope="row" className="p-2">
                      {row.before.name}
                    </th>
                    <td className="p-2">
                      {number(row.before.orderQuantity)}
                      {row.before.purchaseUnit}
                    </td>
                    <td className="p-2">
                      {number(row.after.orderQuantity)}
                      {row.after.purchaseUnit}
                    </td>
                    <td className="p-2">
                      {row.samePurchaseSpec
                        ? difference(
                            row.orderDifference,
                            row.after.purchaseUnit,
                          )
                        : "규격 다름"}
                    </td>
                    <td className="p-2">
                      {difference(row.costDifference, "원")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              입력 조건·요소·조정값 변경 확인
            </summary>

            <div className="mt-3 space-y-2 text-sm">
              {siteFields.map(({ key, label }) => {
                const left =
                  key === "shape"
                    ? (before.snapshot.siteInput[key] ?? "RECTANGLE")
                    : before.snapshot.siteInput[key];

                const right =
                  key === "shape"
                    ? (after.snapshot.siteInput[key] ?? "RECTANGLE")
                    : after.snapshot.siteInput[key];

                if (left === right) return null;

                return (
                  <p key={key}>
                    {label}: {displayInput(left)}
                    {" → "}
                    {displayInput(right)}
                  </p>
                );
              })}

              {materialFields.map(({ key, label }) => {
                const left = before.snapshot.materialInput[key];
                const right = after.snapshot.materialInput[key];

                if (left === right) return null;

                return (
                  <p key={key}>
                    {label}: {displayInput(left)}
                    {" → "}
                    {displayInput(right)}
                  </p>
                );
              })}

              <p>
                공간 면적: {number(before.snapshot.result.areaM2)}㎡{" → "}
                {number(after.snapshot.result.areaM2)}㎡
              </p>

              <p>
                현장 요소: {before.snapshot.features.length}개{" → "}
                {after.snapshot.features.length}개{" · "}
                {JSON.stringify(before.snapshot.features) ===
                JSON.stringify(after.snapshot.features)
                  ? "데이터 동일"
                  : "위치·크기·종류 또는 요소 구성이 변경됨"}
              </p>

              <p>
                현장 조정값: {before.snapshot.adjustments.length}개{" → "}
                {after.snapshot.adjustments.length}개{" · "}
                {JSON.stringify(before.snapshot.adjustments) ===
                JSON.stringify(after.snapshot.adjustments)
                  ? "데이터 동일"
                  : "조정값 또는 연결 정보가 변경됨"}
              </p>

              <p className="text-xs leading-5 text-slate-500">
                요소·조정값 변경 여부에는 식별자와 목록 순서도 포함됩니다. 상세
                내역은 아래 원본에서 확인하세요.
              </p>

              <details>
                <summary className="cursor-pointer">
                  변경 전·후 요소와 조정값 원본
                </summary>

                <div className="mt-2 grid min-w-0 gap-3">
                  {(
                    [
                      ["변경 전", before],
                      ["변경 후", after],
                    ] satisfies [string, CalculationPlan][]
                  ).map(([label, plan]) => {
                    if (typeof plan === "string") return null;

                    return (
                      <div key={String(label)} className="min-w-0">
                        <p className="font-medium">{String(label)}</p>
                        <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs">
                          {JSON.stringify(
                            {
                              features: plan.snapshot.features,
                              adjustments: plan.snapshot.adjustments,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          </details>
        </div>
      )}

      {plans.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold">
            저장한 계산안 관리
          </summary>

          <ul className="mt-3 space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="break-words font-medium">{plan.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {plan.snapshot.siteInput.name}
                    {" · "}
                    계산 시각{" "}
                    {new Date(plan.snapshot.calculatedAt).toLocaleString(
                      "ko-KR",
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => remove(plan.id)}
                  className="cp-button-secondary shrink-0"
                  aria-label={`${plan.name} 계산안 삭제`}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
