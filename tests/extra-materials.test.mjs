import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateExtraMaterials,
  sumEstimatedCosts,
  validateExtraMaterials,
} from "../lib/calculations/extra-materials.ts";

function item(overrides = {}) {
  return {
    id: "extra-1",
    name: "사용자 입력 자재",
    quantity: "3",
    unit: "봉",
    unitPrice: "2000",
    memo: "현장 담당자 입력",
    ...overrides,
  };
}

test("사용자 수량과 단가로 금액을 계산한다", () => {
  const result = calculateExtraMaterials([item()]);

  assert.equal(result.items[0].estimatedCost, 6000);
  assert.equal(result.totalEstimatedCost, 6000);
  assert.equal(result.items[0].sourceType, "USER_INPUT");
});

test("기타 자재가 없으면 합계는 0원이다", () => {
  assert.deepEqual(calculateExtraMaterials([]), {
    items: [],
    totalEstimatedCost: 0,
  });
});

test("단가 공란과 0원을 구분한다", () => {
  const missing = calculateExtraMaterials([item({ unitPrice: "" })]);

  const zero = calculateExtraMaterials([item({ unitPrice: "0" })]);

  assert.equal(missing.items[0].unitPrice, null);
  assert.equal(missing.totalEstimatedCost, null);

  assert.equal(zero.items[0].unitPrice, 0);
  assert.equal(zero.totalEstimatedCost, 0);
});

test("수량 0을 허용하되 단가 공란은 유지한다", () => {
  assert.equal(
    calculateExtraMaterials([item({ quantity: "0" })]).totalEstimatedCost,
    0,
  );

  assert.equal(
    calculateExtraMaterials([item({ quantity: "0", unitPrice: "" })])
      .totalEstimatedCost,
    null,
  );
});

test("음수·공란·유한하지 않은 수량을 거부한다", () => {
  for (const quantity of ["-1", "", "NaN", "Infinity"]) {
    assert.throws(() => calculateExtraMaterials([item({ quantity })]));
  }
});

test("구매 단위나 자재명이 없으면 거부한다", () => {
  assert.ok(validateExtraMaterials([item({ unit: "" })]).length > 0);

  assert.ok(validateExtraMaterials([item({ name: "" })]).length > 0);
});

test("중복 식별자를 거부한다", () => {
  assert.throws(() => calculateExtraMaterials([item(), item()]));
});

test("계산 금액의 오버플로를 거부한다", () => {
  assert.throws(() =>
    calculateExtraMaterials([
      item({
        quantity: "1e308",
        unitPrice: "1e308",
      }),
    ]),
  );
});

test("자동 산출 금액과 기타 자재비를 합산한다", () => {
  assert.equal(sumEstimatedCosts([10000, 6000]), 16000);
  assert.equal(sumEstimatedCosts([null, 6000]), null);
});

test("원본 입력을 수정하지 않는다", () => {
  const inputs = [item()];
  const before = structuredClone(inputs);

  calculateExtraMaterials(inputs);

  assert.deepEqual(inputs, before);
});
