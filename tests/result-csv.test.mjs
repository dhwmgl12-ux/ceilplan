import test from "node:test";
import assert from "node:assert/strict";
import { calculateBase } from "../lib/calculations/base.ts";
import { snapshotToCsv } from "../lib/result-csv.ts";

function createSnapshot(name = "CSV 검산 현장") {
  const siteInput = {
    name,
    widthMm: "4000",
    lengthMm: "3000",
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
    boardUnitPrice: "",
    mbarUnitPrice: "0",
    carryingUnitPrice: "300",
  };

  const features = [
    {
      id: "feature-1",
      type: "LIGHT_BOX",
      xMm: 0,
      yMm: 0,
      widthMm: 1000,
      lengthMm: 1000,
    },
  ];

  const adjustments = [
    {
      id: "adjustment-1",
      featureId: "feature-1",
      materialId: "MBAR",
      adjustmentType: "DEDUCT",
      quantity: 4,
      unit: "m",
      memo: "검산용 공제",
      sourceType: "USER_INPUT",
      status: "INPUT_BASED",
    },
  ];

  return {
    calculatedAt: "2026-10-10T00:00:00.000Z",
    calculationRuleVersion: "area-manual-adjustment-v1",
    siteInput,
    materialInput,
    features,
    adjustments,
    result: calculateBase(siteInput, materialInput, {
      features,
      adjustments,
    }),
  };
}

test("헤더와 자재 3개 행을 출력한다", () => {
  const csv = snapshotToCsv(createSnapshot());

  assert.equal(csv.split("\r\n").length, 4);
  assert.ok(csv.includes('"이론 수량"'));
  assert.ok(csv.includes('"현장 순증감"'));
  assert.ok(csv.includes('"석고보드"'));
  assert.ok(csv.includes('"M-BAR"'));
  assert.ok(csv.includes('"캐링채널"'));
});

test("Snapshot의 조정·발주·금액을 출력한다", () => {
  const csv = snapshotToCsv(createSnapshot());
  const mbarRow = csv.split("\r\n")[2];

  // 기본 12m - 공제 4m = 8m → 2본
  // 숫자 타입의 음수에는 수식 방지 접두사를 붙이지 않습니다.
  assert.ok(mbarRow.includes(',"12","m","0","4","-4","8",'));
  assert.ok(mbarRow.includes(',"2","본","8","0","0",'));
});

test("미입력 금액과 0원을 구분한다", () => {
  const rows = snapshotToCsv(createSnapshot()).split("\r\n");

  assert.ok(rows[1].includes(',"미입력","미입력",'));
  assert.ok(rows[2].includes(',"0","0",'));
});

test("쉼표·따옴표·줄바꿈이 포함된 문자열을 처리한다", () => {
  const csv = snapshotToCsv(createSnapshot('현장,"가"\n2층'));

  assert.ok(csv.includes('"현장,""가""\n2층"'));
});

test("사용자 문자열의 스프레드시트 수식 실행을 방지한다", () => {
  for (const name of ["=1+1", "+SUM(A1)", "-1+2", "@SUM(A1)", "  =1"]) {
    const csv = snapshotToCsv(createSnapshot(name));

    assert.ok(csv.includes(`"'${name}"`));
  }
});

test("내보내기가 Snapshot을 변경하지 않는다", () => {
  const snapshot = createSnapshot();
  const original = structuredClone(snapshot);

  snapshotToCsv(snapshot);

  assert.deepEqual(snapshot, original);
});
