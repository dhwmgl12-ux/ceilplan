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

const adjustmentSite = {
  name: "현장 조정 검산",
  widthMm: "4000",
  lengthMm: "3000",
};

const adjustmentMaterial = {
  ...material,
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
};

const adjustmentFeature = {
  id: "feature-1",
  type: "LIGHT_BOX",
  xMm: 0,
  yMm: 0,
  widthMm: 1000,
  lengthMm: 1000,
};

function createAdjustment(overrides = {}) {
  return {
    id: "adjustment-1",
    featureId: adjustmentFeature.id,
    materialId: "MBAR",
    adjustmentType: "ADD",
    quantity: 4,
    unit: "m",
    memo: "사용자 검산용 조정",
    sourceType: "USER_INPUT",
    status: "INPUT_BASED",
    ...overrides,
  };
}

function calculateAdjusted(adjustments, materialOverrides = {}) {
  return calculateBase(
    adjustmentSite,
    { ...adjustmentMaterial, ...materialOverrides },
    {
      features: [adjustmentFeature],
      adjustments,
    },
  );
}

test("조정값이 없어도 조정 합계는 0으로 기록한다", () => {
  const result = calculateAdjusted([]);

  for (const item of result.materials) {
    assert.equal(item.featureAdjustment.addedQuantity, 0);
    assert.equal(item.featureAdjustment.deductedQuantity, 0);
    assert.equal(item.featureAdjustment.netQuantity, 0);
    assert.deepEqual(item.featureAdjustment.items, []);
    assert.equal(item.quantityBeforeLoss, item.theoreticalQuantity);
  }
});

test("현장 추가 후 정척 본수와 금액을 계산한다", () => {
  // 기본 12m + 추가 4m = 16m → 4본
  const result = calculateAdjusted([createAdjustment()]);
  const mbar = result.materials[1];

  assert.equal(mbar.theoreticalQuantity, 12);
  assert.equal(mbar.featureAdjustment.addedQuantity, 4);
  assert.equal(mbar.featureAdjustment.netQuantity, 4);
  assert.equal(mbar.quantityBeforeLoss, 16);
  assert.equal(mbar.lossAmount, 0);
  assert.equal(mbar.orderQuantity, 4);
  assert.equal(mbar.roundingSurplus, 0);
  assert.equal(mbar.estimatedCost, 800);
  assert.equal(result.totalEstimatedCost, 2900);
});

test("현장 공제 후 발주 수량을 계산한다", () => {
  // 기본 12m - 공제 4m = 8m → 2본
  const result = calculateAdjusted([
    createAdjustment({ adjustmentType: "DEDUCT" }),
  ]);

  const mbar = result.materials[1];

  assert.equal(mbar.featureAdjustment.deductedQuantity, 4);
  assert.equal(mbar.featureAdjustment.netQuantity, -4);
  assert.equal(mbar.quantityBeforeLoss, 8);
  assert.equal(mbar.orderQuantity, 2);
  assert.equal(mbar.estimatedCost, 400);
});

test("추가와 공제를 구분한 뒤 Loss를 적용한다", () => {
  // 12m + 4m - 2m = 14m
  // Loss 10% → 15.4m → 4본, 주문 길이 16m
  const result = calculateAdjusted(
    [
      createAdjustment(),
      createAdjustment({
        id: "adjustment-2",
        adjustmentType: "DEDUCT",
        quantity: 2,
      }),
    ],
    { metalLossPercent: "10" },
  );

  const mbar = result.materials[1];

  assert.equal(mbar.featureAdjustment.addedQuantity, 4);
  assert.equal(mbar.featureAdjustment.deductedQuantity, 2);
  assert.equal(mbar.featureAdjustment.netQuantity, 2);
  assert.equal(mbar.quantityBeforeLoss, 14);

  approximatelyEqual(mbar.lossAmount, 1.4);
  approximatelyEqual(mbar.quantityAfterLoss, 15.4);
  assert.equal(mbar.orderQuantity, 4);
  approximatelyEqual(mbar.roundingSurplus, 0.6);
});

test("석고보드 면적 조정에 겹수를 적용하고 금속은 변경하지 않는다", () => {
  // 기본 12㎡ × 2겹 = 24장
  // 추가 1.5㎡ × 2겹 = 3장
  const result = calculateAdjusted(
    [
      createAdjustment({
        materialId: "BOARD",
        quantity: 1.5,
        unit: "㎡",
      }),
    ],
    { layerCount: "2", boardLossPercent: "10" },
  );

  const board = result.materials[0];

  assert.equal(board.theoreticalQuantity, 24);
  assert.equal(board.featureAdjustment.addedQuantity, 3);
  assert.equal(board.quantityBeforeLoss, 27);
  approximatelyEqual(board.quantityAfterLoss, 29.7);
  assert.equal(board.orderQuantity, 30);

  assert.equal(result.materials[1].quantityBeforeLoss, 12);
  assert.equal(result.materials[2].quantityBeforeLoss, 12);
});

test("캐링 조정은 캐링에만 적용한다", () => {
  const result = calculateAdjusted([
    createAdjustment({ materialId: "CARRYING" }),
  ]);

  assert.equal(result.materials[1].quantityBeforeLoss, 12);
  assert.equal(result.materials[2].quantityBeforeLoss, 16);
  assert.equal(result.materials[2].orderQuantity, 4);
});

test("전체 공제로 물량이 0이면 발주와 금액도 0이다", () => {
  const result = calculateAdjusted([
    createAdjustment({
      materialId: "BOARD",
      unit: "㎡",
      adjustmentType: "DEDUCT",
      quantity: 12,
    }),
  ]);

  const board = result.materials[0];

  assert.equal(board.quantityBeforeLoss, 0);
  assert.equal(board.lossAmount, 0);
  assert.equal(board.orderQuantity, 0);
  assert.equal(board.estimatedCost, 0);
});

test("금속 전체 공제도 0본 발주를 허용한다", () => {
  const result = calculateAdjusted([
    createAdjustment({
      adjustmentType: "DEDUCT",
      quantity: 12,
    }),
  ]);

  assert.equal(result.materials[1].quantityBeforeLoss, 0);
  assert.equal(result.materials[1].orderQuantity, 0);
  assert.equal(result.materials[1].estimatedCost, 0);
});

test("전체 공제 후에도 단가 미입력과 0원을 구분한다", () => {
  const adjustments = [
    createAdjustment({
      materialId: "BOARD",
      unit: "㎡",
      adjustmentType: "DEDUCT",
      quantity: 12,
    }),
  ];

  const missing = calculateAdjusted(adjustments, {
    boardUnitPrice: "",
  });

  assert.equal(missing.materials[0].estimatedCost, null);
  assert.equal(missing.totalEstimatedCost, null);

  const zero = calculateAdjusted(adjustments, {
    boardUnitPrice: "0",
  });

  assert.equal(zero.materials[0].estimatedCost, 0);
  assert.equal(zero.totalEstimatedCost, 1500);
});

test("기본 물량과 추가를 합한 수량보다 큰 공제는 거부한다", () => {
  assert.throws(
    () =>
      calculateAdjusted([
        createAdjustment({
          adjustmentType: "DEDUCT",
          quantity: 13,
        }),
      ]),
    /공제 수량/,
  );
});

test("잘못된 조정 수량과 단위 및 근거를 거부한다", () => {
  for (const quantity of [0, -1, NaN, Infinity]) {
    assert.throws(() => calculateAdjusted([createAdjustment({ quantity })]));
  }

  for (const change of [
    { materialId: "BOARD", unit: "m" },
    { materialId: "MBAR", unit: "㎡" },
    { materialId: "UNKNOWN" },
    { adjustmentType: "UNKNOWN" },
    { memo: " " },
    { id: "" },
    { sourceType: "OFFICIAL_STANDARD" },
    { status: "CONFIRMED" },
  ]) {
    assert.throws(() => calculateAdjusted([createAdjustment(change)]));
  }
});

test("연결되지 않은 요소와 중복 조정 ID를 거부한다", () => {
  assert.throws(
    () =>
      calculateAdjusted([createAdjustment({ featureId: "missing-feature" })]),
    /현장 요소를 찾을 수 없습니다/,
  );

  assert.throws(
    () => calculateAdjusted([createAdjustment(), createAdjustment()]),
    /중복/,
  );
});

test("공간 밖 요소에 연결된 조정값은 계산을 중단한다", () => {
  const outsideFeature = {
    ...adjustmentFeature,
    xMm: 3500,
  };

  assert.throws(
    () =>
      calculateBase(adjustmentSite, adjustmentMaterial, {
        features: [outsideFeature],
        adjustments: [createAdjustment()],
      }),
    /공간 밖/,
  );

  // 연결된 조정값이 없으면 기존 기본 계산은 허용합니다.
  assert.doesNotThrow(() =>
    calculateBase(adjustmentSite, adjustmentMaterial, {
      features: [outsideFeature],
      adjustments: [],
    }),
  );
});

test("조정 합계가 숫자 범위를 초과하면 거부한다", () => {
  assert.throws(() =>
    calculateAdjusted([
      createAdjustment({ quantity: 1e308 }),
      createAdjustment({
        id: "adjustment-2",
        quantity: 1e308,
      }),
    ]),
  );
});

test("조정 원본을 변경하지 않고 계산 결과에 복사한다", () => {
  const adjustment = Object.freeze(createAdjustment());
  const feature = Object.freeze({ ...adjustmentFeature });

  const result = calculateBase(
    Object.freeze({ ...adjustmentSite }),
    Object.freeze({ ...adjustmentMaterial }),
    {
      features: Object.freeze([feature]),
      adjustments: Object.freeze([adjustment]),
    },
  );

  const applied = result.materials[1].featureAdjustment.items[0];

  assert.deepEqual(applied.adjustment, adjustment);
  assert.notEqual(applied.adjustment, adjustment);
  assert.equal(applied.featureType, "LIGHT_BOX");
  assert.equal(applied.convertedQuantity, 4);
});

function createRepeatedDeductions(quantity, count) {
  return Array.from({ length: count }, (_, index) =>
    createAdjustment({
      id: `decimal-deduction-${index}`,
      adjustmentType: "DEDUCT",
      quantity,
    }),
  );
}

test("소수 공제 후 작은 양수 오차가 남아도 0본으로 처리한다", () => {
  // 기본 12m - 0.1m × 120회 = 0m
  const result = calculateAdjusted(createRepeatedDeductions(0.1, 120));

  const mbar = result.materials[1];

  assert.equal(mbar.quantityBeforeLoss, 0);
  assert.equal(mbar.quantityAfterLoss, 0);
  assert.equal(mbar.orderQuantity, 0);
  assert.equal(mbar.orderedQuantity, 0);
  assert.equal(mbar.roundingSurplus, 0);
  assert.equal(mbar.estimatedCost, 0);
});

test("소수 공제 후 작은 음수 오차를 과도한 공제로 판단하지 않는다", () => {
  // 기본 12m - 0.3m × 40회 = 0m
  const result = calculateAdjusted(createRepeatedDeductions(0.3, 40));

  const mbar = result.materials[1];

  assert.equal(mbar.quantityBeforeLoss, 0);
  assert.equal(mbar.orderQuantity, 0);
});

test("소수 추가와 공제를 함께 적용해도 최종 0을 유지한다", () => {
  // 기본 12m + 0.1m + 0.2m - 12.3m = 0m
  const result = calculateAdjusted([
    createAdjustment({
      id: "decimal-add-1",
      quantity: 0.1,
    }),
    createAdjustment({
      id: "decimal-add-2",
      quantity: 0.2,
    }),
    createAdjustment({
      id: "decimal-deduct",
      adjustmentType: "DEDUCT",
      quantity: 12.3,
    }),
  ]);

  assert.equal(result.materials[1].quantityBeforeLoss, 0);
  assert.equal(result.materials[1].orderQuantity, 0);
});

test("석고보드 소수 면적 공제에도 같은 경계 처리를 적용한다", () => {
  const adjustments = createRepeatedDeductions(0.3, 40).map((adjustment) => ({
    ...adjustment,
    materialId: "BOARD",
    unit: "㎡",
  }));

  // 기본 12㎡를 모두 공제합니다. 겹수가 달라도 최종 물량은 0입니다.
  const result = calculateAdjusted(adjustments, {
    layerCount: "2",
    boardLossPercent: "7",
  });

  const board = result.materials[0];

  assert.equal(board.quantityBeforeLoss, 0);
  assert.equal(board.lossAmount, 0);
  assert.equal(board.orderQuantity, 0);
});

test("연산 오차보다 큰 실제 잔량은 0으로 없애지 않는다", () => {
  const result = calculateAdjusted([
    createAdjustment({
      adjustmentType: "DEDUCT",
      quantity: 11.999999,
    }),
  ]);

  const mbar = result.materials[1];

  assert.ok(mbar.quantityBeforeLoss > 0);
  approximatelyEqual(mbar.quantityBeforeLoss, 0.000001);
  assert.equal(mbar.orderQuantity, 1);
});

test("연산 오차보다 큰 실제 초과 공제는 계속 거부한다", () => {
  assert.throws(
    () =>
      calculateAdjusted([
        createAdjustment({
          adjustmentType: "DEDUCT",
          quantity: 12.000001,
        }),
      ]),
    /공제 수량/,
  );
});

test("소수 전체 공제 후에도 단가 미입력은 null로 유지한다", () => {
  const result = calculateAdjusted(createRepeatedDeductions(0.3, 40), {
    mbarUnitPrice: "",
  });

  const mbar = result.materials[1];

  assert.equal(mbar.orderQuantity, 0);
  assert.equal(mbar.unitPrice, null);
  assert.equal(mbar.estimatedCost, null);
  assert.equal(result.totalEstimatedCost, null);
});
