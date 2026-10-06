import test from "node:test";
import assert from "node:assert/strict";
import { calculateBase, validateInputs } from "../lib/calculations/base.ts";

const site = {
  name: "문서 검산 사례",
  widthMm: "8400",
  lengthMm: "6200",
};

const material = {
  mbarSpacingMm: "300",
  carryingSpacingMm: "900",
  boardWidthMm: "900",
  boardLengthMm: "1800",
  layerCount: "1",
  boardLossPercent: "7",
  metalLossPercent: "5",
  mbarStockLengthMm: "4000",
  carryingStockLengthMm: "4000",
  boardUnitPrice: "8500",
  mbarUnitPrice: "3200",
  carryingUnitPrice: "4100",
};

function approximatelyEqual(actual, expected) {
  const tolerance = 1e-9 * Math.max(1, Math.abs(expected));

  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, received ${actual}`,
  );
}

test("문서 사례의 면적과 기본 물량을 계산한다", () => {
  const result = calculateBase(site, material);
  const [board, mbar, carrying] = result.materials;

  approximatelyEqual(result.areaM2, 52.08);
  approximatelyEqual(board.theoreticalQuantity, 32.148148148148145);
  approximatelyEqual(mbar.theoreticalQuantity, 173.6);
  approximatelyEqual(carrying.theoreticalQuantity, 57.86666666666667);
});

test("Loss와 발주 올림을 구분하고 구매 단가를 적용한다", () => {
  const result = calculateBase(site, material);
  const [board, mbar, carrying] = result.materials;

  approximatelyEqual(board.quantityAfterLoss, 34.398518518518514);
  approximatelyEqual(board.lossAmount, 2.25037037037037);

  assert.equal(board.orderQuantity, 35);
  approximatelyEqual(board.roundingSurplus, 0.601481481481486);

  approximatelyEqual(mbar.quantityAfterLoss, 182.28);
  assert.equal(mbar.orderQuantity, 46);
  assert.equal(mbar.orderedQuantity, 184);
  approximatelyEqual(mbar.roundingSurplus, 1.72);

  assert.equal(carrying.orderQuantity, 16);
  assert.equal(carrying.orderedQuantity, 64);

  assert.equal(board.estimatedCost, 297500);
  assert.equal(mbar.estimatedCost, 147200);
  assert.equal(carrying.estimatedCost, 65600);
  assert.equal(result.totalEstimatedCost, 510300);
});

test("겹수가 늘면 석고보드 이론 수량만 늘어난다", () => {
  const oneLayer = calculateBase(site, material);
  const twoLayers = calculateBase(site, {
    ...material,
    layerCount: "2",
  });

  approximatelyEqual(
    twoLayers.materials[0].theoreticalQuantity,
    oneLayer.materials[0].theoreticalQuantity * 2,
  );

  assert.equal(
    twoLayers.materials[1].theoreticalQuantity,
    oneLayer.materials[1].theoreticalQuantity,
  );
});

test("정확히 나누어지는 수량을 추가 올림하지 않는다", () => {
  const result = calculateBase(
    { name: "정수 경계 검산", widthMm: "3000", lengthMm: "3000" },
    {
      ...material,
      boardWidthMm: "1000",
      boardLengthMm: "1000",
      boardLossPercent: "0",
      metalLossPercent: "0",
      mbarStockLengthMm: "3000",
      carryingStockLengthMm: "1000",
    },
  );

  assert.equal(result.materials[0].orderQuantity, 9);
  assert.equal(result.materials[1].orderQuantity, 10);
  assert.equal(result.materials[2].orderQuantity, 10);

  for (const item of result.materials) {
    approximatelyEqual(item.lossAmount, 0);
    approximatelyEqual(item.roundingSurplus, 0);
  }
});

test("단가 미입력과 명시적인 0원을 구분한다", () => {
  const missing = calculateBase(site, {
    ...material,
    boardUnitPrice: "",
  });

  assert.equal(missing.materials[0].unitPrice, null);
  assert.equal(missing.materials[0].estimatedCost, null);
  assert.equal(missing.totalEstimatedCost, null);

  const zero = calculateBase(site, {
    ...material,
    boardUnitPrice: "0",
  });

  assert.equal(zero.materials[0].estimatedCost, 0);
  assert.equal(zero.totalEstimatedCost, 212800);
});

test("빈 값, 잘못된 치수, 소수 겹수, 음수 Loss·단가를 거부한다", () => {
  assert.ok(validateInputs({ ...site, name: "" }, material).length);

  for (const widthMm of ["", "0", "-1", "Infinity", "abc"]) {
    assert.throws(() => calculateBase({ ...site, widthMm }, material));
  }

  for (const change of [
    { mbarSpacingMm: "0" },
    { carryingStockLengthMm: "" },
    { boardWidthMm: "-1" },
    { layerCount: "1.5" },
    { boardLossPercent: "" },
    { metalLossPercent: "-1" },
    { boardUnitPrice: "-1" },
  ]) {
    assert.throws(() => calculateBase(site, { ...material, ...change }));
  }
});

test("계산 결과가 숫자 범위를 초과하면 거부한다", () => {
  assert.throws(() =>
    calculateBase({ ...site, widthMm: "1e308", lengthMm: "1e308" }, material),
  );
});

test("원본 입력을 변경하지 않는다", () => {
  const frozenSite = Object.freeze({ ...site });
  const frozenMaterial = Object.freeze({ ...material });

  calculateBase(frozenSite, frozenMaterial);

  assert.deepEqual(frozenSite, site);
  assert.deepEqual(frozenMaterial, material);
});
