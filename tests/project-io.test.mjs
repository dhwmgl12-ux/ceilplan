import test from "node:test";
import assert from "node:assert/strict";
import { calculateBase } from "../lib/calculations/base.ts";
import { exportProjectJson, importProjectJson } from "../lib/project-io.ts";

const siteInput = {
  name: "JSON 검산 현장",
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
    adjustmentType: "ADD",
    quantity: 4,
    unit: "m",
    memo: "등박스 골조 추가",
    sourceType: "USER_INPUT",
    status: "INPUT_BASED",
  },
];

const timestamp = "2026-10-10T00:00:00.000Z";

function createProject() {
  const snapshot = {
    calculatedAt: timestamp,
    calculationRuleVersion: "area-manual-adjustment-v1",
    siteInput: structuredClone(siteInput),
    materialInput: structuredClone(materialInput),
    features: structuredClone(features),
    adjustments: structuredClone(adjustments),
    result: calculateBase(siteInput, materialInput, {
      features,
      adjustments,
    }),
  };

  return {
    id: "project-1",
    updatedAt: timestamp,
    siteInput: structuredClone(siteInput),
    materialInput: structuredClone(materialInput),
    features: structuredClone(features),
    adjustments: structuredClone(adjustments),
    snapshot,
  };
}

test("JSON 왕복 후 입력·조정값·Snapshot이 동일하다", () => {
  const project = createProject();
  const restored = importProjectJson(exportProjectJson(project, timestamp));

  assert.deepEqual(restored, project);
  assert.notEqual(restored, project);
});

test("현재 입력과 이전 Snapshot이 달라도 각각 보존한다", () => {
  const project = createProject();
  project.siteInput.widthMm = "5000";

  const restored = importProjectJson(exportProjectJson(project));

  assert.equal(restored.siteInput.widthMm, "5000");
  assert.equal(restored.snapshot.siteInput.widthMm, "4000");
});

test("단가 미입력과 0원을 보존한다", () => {
  const restored = importProjectJson(exportProjectJson(createProject()));

  assert.equal(restored.snapshot.result.materials[0].unitPrice, null);
  assert.equal(restored.snapshot.result.materials[1].unitPrice, 0);
});

test("이전 프로젝트의 선택 필드를 기본 구조로 보완한다", () => {
  const project = {
    id: "legacy-1",
    updatedAt: timestamp,
    siteInput,
    materialInput,
  };

  const restored = importProjectJson(exportProjectJson(project));

  assert.deepEqual(restored.features, []);
  assert.deepEqual(restored.adjustments, []);
  assert.equal(restored.snapshot, null);
});

test("잘못된 JSON과 지원하지 않는 버전을 거부한다", () => {
  assert.throws(() => importProjectJson("{"));

  const data = JSON.parse(exportProjectJson(createProject()));
  data.schemaVersion = 999;

  assert.throws(() => importProjectJson(JSON.stringify(data)));
});

test("누락된 입력 필드를 거부한다", () => {
  const data = JSON.parse(exportProjectJson(createProject()));
  delete data.project.materialInput.boardWidthMm;

  assert.throws(() => importProjectJson(JSON.stringify(data)));
});

test("연결되지 않은 조정값과 중복 ID를 거부한다", () => {
  const project = createProject();
  project.adjustments[0].featureId = "missing";

  assert.throws(() => exportProjectJson(project));

  const duplicate = createProject();
  duplicate.adjustments.push({ ...duplicate.adjustments[0] });

  assert.throws(() => exportProjectJson(duplicate));
});

test("Snapshot의 잘못된 수량과 누락된 자재를 거부한다", () => {
  const negative = createProject();
  negative.snapshot.result.materials[0].orderQuantity = -1;

  assert.throws(() => exportProjectJson(negative));

  const missing = createProject();
  missing.snapshot.result.materials.pop();

  assert.throws(() => exportProjectJson(missing));
});

test("원본 프로젝트를 변경하지 않는다", () => {
  const project = createProject();
  const original = structuredClone(project);

  exportProjectJson(project);
  assert.deepEqual(project, original);
});
