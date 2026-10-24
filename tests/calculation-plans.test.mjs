import test from "node:test";
import assert from "node:assert/strict";

import { calculateBase } from "../lib/calculations/base.ts";
import {
  compareCalculationPlans,
  deleteCalculationPlan,
  nullableDifference,
  readCalculationPlans,
  saveCalculationPlan,
} from "../lib/calculation-plans.ts";

function createSnapshot(overrides = {}) {
  const siteInput = {
    name: "검증용 공간",
    widthMm: "3000",
    lengthMm: "2000",
  };

  const materialInput = {
    mbarSpacingMm: "1000",
    carryingSpacingMm: "1000",
    boardWidthMm: "1000",
    boardLengthMm: "1000",
    layerCount: "1",
    boardLossPercent: "0",
    metalLossPercent: "0",
    mbarStockLengthMm: "4000",
    carryingStockLengthMm: "4000",
    boardUnitPrice: "100",
    mbarUnitPrice: "200",
    carryingUnitPrice: "300",
    ...overrides,
  };

  return {
    calculatedAt: "2026-10-24T00:00:00.000Z",
    calculationRuleVersion: "test-rule-v1",
    siteInput,
    materialInput,
    features: [],
    adjustments: [],
    result: calculateBase(siteInput, materialInput),
  };
}

function memoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("계산안을 저장하고 삭제한다", () => {
  const storage = memoryStorage();

  const plan = {
    id: "plan-1",
    name: "기존안",
    savedAt: "2026-10-24T00:00:00.000Z",
    snapshot: createSnapshot(),
  };

  saveCalculationPlan(plan, storage);

  assert.deepEqual(readCalculationPlans(storage), [plan]);

  deleteCalculationPlan(plan.id, storage);

  assert.deepEqual(readCalculationPlans(storage), []);
});

test("계산안 저장 후 원본을 바꿔도 저장본은 유지된다", () => {
  const storage = memoryStorage();
  const snapshot = createSnapshot();

  saveCalculationPlan(
    {
      id: "plan-1",
      name: "기존안",
      savedAt: "2026-10-24T00:00:00.000Z",
      snapshot,
    },
    storage,
  );

  snapshot.materialInput.boardUnitPrice = "999";
  snapshot.result.totalEstimatedCost = 999;

  const [saved] = readCalculationPlans(storage);

  assert.equal(saved.snapshot.materialInput.boardUnitPrice, "100");
  assert.equal(saved.snapshot.result.totalEstimatedCost, 1600);
});

test("단가 변경의 금액 차이를 비교한다", () => {
  const before = createSnapshot();
  const after = createSnapshot({ boardUnitPrice: "200" });

  const rows = compareCalculationPlans(before, after);
  const board = rows.find((row) => row.id === "BOARD");

  // 6장 × 단가 증가 100원 = 600원
  assert.equal(board.orderDifference, 0);
  assert.equal(board.costDifference, 600);

  assert.equal(
    nullableDifference(
      before.result.totalEstimatedCost,
      after.result.totalEstimatedCost,
    ),
    600,
  );
});

test("정척이 다르면 본수 차이를 직접 비교하지 않는다", () => {
  const before = createSnapshot();
  const after = createSnapshot({ mbarStockLengthMm: "3000" });

  const row = compareCalculationPlans(before, after).find(
    (item) => item.id === "MBAR",
  );

  assert.equal(row.samePurchaseSpec, false);
  assert.equal(row.orderDifference, null);
});

test("단가 미입력과 0원을 구분한다", () => {
  const before = createSnapshot({ boardUnitPrice: "" });
  const after = createSnapshot({ boardUnitPrice: "0" });

  const row = compareCalculationPlans(before, after).find(
    (item) => item.id === "BOARD",
  );

  assert.equal(row.before.estimatedCost, null);
  assert.equal(row.after.estimatedCost, 0);
  assert.equal(row.costDifference, null);

  assert.equal(nullableDifference(null, 0), null);
  assert.equal(nullableDifference(0, 0), 0);
});

test("비교 함수가 원본 Snapshot을 수정하지 않는다", () => {
  const before = createSnapshot();
  const after = createSnapshot({ boardLossPercent: "10" });

  const originals = structuredClone({ before, after });

  compareCalculationPlans(before, after);

  assert.deepEqual({ before, after }, originals);
});

test("손상된 계산안 목록을 덮어쓰지 않는다", () => {
  let raw = "{손상된 데이터";

  const storage = {
    getItem() {
      return raw;
    },
    setItem(_key, value) {
      raw = value;
    },
  };

  assert.throws(() =>
    saveCalculationPlan(
      {
        id: "plan-1",
        name: "기존안",
        savedAt: "2026-10-24T00:00:00.000Z",
        snapshot: createSnapshot(),
      },
      storage,
    ),
  );

  assert.equal(raw, "{손상된 데이터");
});
