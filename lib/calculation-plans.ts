import type {
  CalculationSnapshot,
  MaterialCalculation,
  MaterialId,
} from "../types/ceilplan";
import { isCalculationSnapshot } from "./project-io.ts";

export interface CalculationPlan {
  id: string;
  name: string;
  savedAt: string;
  snapshot: CalculationSnapshot;
}

export interface MaterialComparison {
  id: MaterialId;
  before: MaterialCalculation;
  after: MaterialCalculation;
  samePurchaseSpec: boolean;
  orderDifference: number | null;
  costDifference: number | null;
}

const STORAGE_KEY = "ceilplan.calculation-plans.v1";

type PlanStorage = Pick<Storage, "getItem" | "setItem">;

function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isPlan(value: unknown): value is CalculationPlan {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    Boolean(item.id.trim()) &&
    typeof item.name === "string" &&
    Boolean(item.name.trim()) &&
    validDate(item.savedAt) &&
    isCalculationSnapshot(item.snapshot)
  );
}

export function readCalculationPlans(
  storage: Pick<Storage, "getItem"> = localStorage,
): CalculationPlan[] {
  const raw = storage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  const value: unknown = JSON.parse(raw);

  if (typeof value !== "object" || value === null) {
    throw new Error("계산안 저장 형식이 올바르지 않습니다.");
  }

  const data = value as Record<string, unknown>;

  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.plans) ||
    !data.plans.every(isPlan)
  ) {
    throw new Error("계산안 목록 또는 Snapshot 형식을 확인하세요.");
  }

  if (new Set(data.plans.map((plan) => plan.id)).size !== data.plans.length) {
    throw new Error("계산안 식별자가 중복되어 있습니다.");
  }

  return structuredClone(data.plans);
}

function writePlans(plans: CalculationPlan[], storage: PlanStorage) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      plans,
    }),
  );
}

export function saveCalculationPlan(
  plan: CalculationPlan,
  storage: PlanStorage = localStorage,
): CalculationPlan[] {
  if (!isPlan(plan)) {
    throw new Error("계산안 이름과 계산 결과를 확인하세요.");
  }

  // 손상된 기존 데이터를 덮어쓰지 않습니다.
  const previous = readCalculationPlans(storage);

  const next = [
    structuredClone(plan),
    ...previous.filter((item) => item.id !== plan.id),
  ];

  writePlans(next, storage);

  return next;
}

export function deleteCalculationPlan(
  id: string,
  storage: PlanStorage = localStorage,
): CalculationPlan[] {
  const previous = readCalculationPlans(storage);
  const next = previous.filter((plan) => plan.id !== id);

  writePlans(next, storage);

  return next;
}

export function nullableDifference(
  before: number | null,
  after: number | null,
): number | null {
  if (before === null || after === null) return null;

  const difference = after - before;

  if (!Number.isFinite(difference)) {
    throw new Error("비교 가능한 숫자 범위를 벗어났습니다.");
  }

  return difference;
}

function samePurchaseSpec(
  before: CalculationSnapshot,
  after: CalculationSnapshot,
  materialId: MaterialId,
): boolean {
  const left = before.materialInput;
  const right = after.materialInput;

  if (materialId === "BOARD") {
    return (
      Number(left.boardWidthMm) === Number(right.boardWidthMm) &&
      Number(left.boardLengthMm) === Number(right.boardLengthMm)
    );
  }

  const field =
    materialId === "MBAR" ? "mbarStockLengthMm" : "carryingStockLengthMm";

  return Number(left[field]) === Number(right[field]);
}

export function compareCalculationPlans(
  before: CalculationSnapshot,
  after: CalculationSnapshot,
): MaterialComparison[] {
  return before.result.materials.map((left) => {
    const right = after.result.materials.find(
      (material) => material.id === left.id,
    );

    if (!right) {
      throw new Error("비교할 자재 구성이 일치하지 않습니다.");
    }

    const comparable =
      left.purchaseUnit === right.purchaseUnit &&
      samePurchaseSpec(before, after, left.id);

    return {
      id: left.id,
      before: structuredClone(left),
      after: structuredClone(right),
      samePurchaseSpec: comparable,

      orderDifference: comparable
        ? nullableDifference(left.orderQuantity, right.orderQuantity)
        : null,

      costDifference: nullableDifference(
        left.estimatedCost,
        right.estimatedCost,
      ),
    };
  });
}
