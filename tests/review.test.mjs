import test from "node:test";
import assert from "node:assert/strict";

import { collectReviewItems } from "../lib/review.ts";

function createInput() {
  return {
    siteInput: {
      name: "검증용 공간",
      widthMm: "5000",
      lengthMm: "4000",
      shape: "RECTANGLE",
    },

    materialInput: {
      mbarSpacingMm: "300",
      carryingSpacingMm: "1000",
      boardWidthMm: "900",
      boardLengthMm: "1800",
      layerCount: "1",
      boardLossPercent: "0",
      metalLossPercent: "0",
      mbarStockLengthMm: "4000",
      carryingStockLengthMm: "4000",
      boardUnitPrice: "0",
      mbarUnitPrice: "0",
      carryingUnitPrice: "0",
    },

    features: [],
    adjustments: [],

    hasSnapshot: true,
    stale: false,
    dirty: false,
    calculationErrors: [],
  };
}

test("유효한 입력에서 0원 단가와 Loss 0을 문제로 취급하지 않는다", () => {
  assert.deepEqual(collectReviewItems(createInput()), []);
});

test("단가 미입력은 오류가 아닌 확인 항목이다", () => {
  const input = createInput();
  input.materialInput.boardUnitPrice = "";

  const items = collectReviewItems(input);
  const price = items.find((item) => item.id === "price-boardUnitPrice");

  assert.equal(price?.level, "CHECK");
  assert.equal(
    items.some((item) => item.level === "ERROR"),
    false,
  );
});

test("입력 검증 오류를 수집한다", () => {
  const input = createInput();
  input.materialInput.mbarSpacingMm = "-1";

  const items = collectReviewItems(input);

  assert.ok(
    items.some(
      (item) => item.level === "ERROR" && item.message.includes("M-BAR 간격"),
    ),
  );
});

test("공간 밖 요소를 확인 항목으로 표시한다", () => {
  const input = createInput();

  input.features.push({
    id: "feature-1",
    type: "INSPECTION_HATCH",
    xMm: 4900,
    yMm: 100,
    widthMm: 300,
    lengthMm: 300,
  });

  const items = collectReviewItems(input);

  assert.equal(
    items.find((item) => item.id === "outside-features")?.level,
    "CHECK",
  );
});

test("조정값이 없는 정상 요소에 조정값 입력을 강제하지 않는다", () => {
  const input = createInput();

  input.features.push({
    id: "feature-1",
    type: "INSPECTION_HATCH",
    xMm: 100,
    yMm: 100,
    widthMm: 300,
    lengthMm: 300,
  });

  assert.deepEqual(collectReviewItems(input), []);
});

test("재계산 필요와 미저장을 구분해서 표시한다", () => {
  const input = createInput();
  input.stale = true;
  input.dirty = true;

  const items = collectReviewItems(input);

  assert.equal(
    items.find((item) => item.id === "stale-result")?.level,
    "CHECK",
  );

  assert.equal(items.find((item) => item.id === "unsaved")?.level, "INFO");
});

test("Snapshot이 없으면 아직 계산하지 않았다고 안내한다", () => {
  const input = createInput();
  input.hasSnapshot = false;

  assert.ok(
    collectReviewItems(input).some((item) => item.id === "not-calculated"),
  );
});

test("동일한 계산 오류 메시지를 중복 표시하지 않는다", () => {
  const input = createInput();

  input.calculationErrors = [
    "조정 후 물량이 음수입니다.",
    "조정 후 물량이 음수입니다.",
  ];

  const items = collectReviewItems(input);

  assert.equal(
    items.filter((item) => item.message === "조정 후 물량이 음수입니다.")
      .length,
    1,
  );
});

test("원본 입력을 수정하지 않는다", () => {
  const input = createInput();
  const before = structuredClone(input);

  collectReviewItems(input);

  assert.deepEqual(input, before);
});
