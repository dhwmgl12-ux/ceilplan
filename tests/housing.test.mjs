import test from "node:test";
import assert from "node:assert/strict";
import { calculateHousingProject } from "../lib/calculations/housing.ts";

function createSpace(id, name) {
  return {
    id,

    siteInput: {
      name,
      widthMm: "3000",
      lengthMm: "2000",
    },

    materialInput: {
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
    },

    features: [],
    adjustments: [],
    snapshot: null,
  };
}

function createProject() {
  return {
    id: "housing-project-1",
    name: "다중 공간 검산",
    updatedAt: "2026-10-17T00:00:00.000Z",

    unitTypes: [
      {
        id: "type-a",
        name: "84A",
        unitCount: 2,

        spaces: [createSpace("living", "거실"), createSpace("kitchen", "주방")],
      },
    ],
  };
}

test("공간 합계와 세대 수를 반영한다", () => {
  const result = calculateHousingProject(createProject(), "PER_SPACE_PER_UNIT");

  const type = result.unitTypes[0];

  assert.equal(type.areaPerUnitM2, 12);
  assert.equal(type.totalAreaM2, 24);
  assert.equal(type.costPerUnit, 3200);
  assert.equal(type.totalEstimatedCost, 6400);

  assert.equal(result.totalUnitCount, 2);
  assert.equal(result.totalAreaM2, 24);
  assert.equal(result.totalEstimatedCost, 6400);
});

test("공간별로 올린 본수를 합산하고 전체 연장을 다시 올리지 않는다", () => {
  const result = calculateHousingProject(createProject(), "PER_SPACE_PER_UNIT");

  const totalMbarPieces = result.unitTypes[0].spaces.reduce((sum, space) => {
    const mbar = space.repeatedMaterials.find(
      (item) => item.material.id === "MBAR",
    );

    return sum + mbar.totalOrderQuantity;
  }, 0);

  // 공간당 2본 × 2공간 × 2세대 = 8본
  assert.equal(totalMbarPieces, 8);
});

test("서로 다른 세대 타입을 합산한다", () => {
  const project = createProject();

  project.unitTypes.push({
    id: "type-b",
    name: "84B",
    unitCount: 1,
    spaces: [createSpace("bedroom", "침실")],
  });

  const result = calculateHousingProject(project, "PER_SPACE_PER_UNIT");

  assert.equal(result.totalUnitCount, 3);
  assert.equal(result.totalAreaM2, 30);
  assert.equal(result.totalEstimatedCost, 8000);
});

test("단가가 빠진 공간이 있으면 전체 합계는 null이다", () => {
  const project = createProject();
  project.unitTypes[0].spaces[1].materialInput.boardUnitPrice = "";

  const result = calculateHousingProject(project, "PER_SPACE_PER_UNIT");

  assert.equal(result.unitTypes[0].costPerUnit, null);
  assert.equal(result.totalEstimatedCost, null);

  // 수량은 계속 확인할 수 있습니다.
  assert.equal(
    result.unitTypes[0].spaces[1].result.materials[0].orderQuantity,
    6,
  );
});

test("공간마다 다른 정척을 유지한다", () => {
  const project = createProject();

  project.unitTypes[0].spaces[1].materialInput.mbarStockLengthMm = "6000";

  const result = calculateHousingProject(project, "PER_SPACE_PER_UNIT");

  const [living, kitchen] = result.unitTypes[0].spaces;

  assert.equal(
    living.result.materials.find((item) => item.id === "MBAR").orderQuantity,
    2,
  );

  assert.equal(
    kitchen.result.materials.find((item) => item.id === "MBAR").orderQuantity,
    1,
  );
});

test("잘못된 세대 수를 거부한다", () => {
  for (const count of [0, -1, 1.5, NaN, Infinity]) {
    const project = createProject();
    project.unitTypes[0].unitCount = count;

    assert.throws(() => calculateHousingProject(project, "PER_SPACE_PER_UNIT"));
  }
});

test("빈 공간과 중복 공간 ID를 거부한다", () => {
  const empty = createProject();
  empty.unitTypes[0].spaces = [];

  assert.throws(() => calculateHousingProject(empty, "PER_SPACE_PER_UNIT"));

  const duplicate = createProject();
  duplicate.unitTypes[0].spaces[1].id = duplicate.unitTypes[0].spaces[0].id;

  assert.throws(() => calculateHousingProject(duplicate, "PER_SPACE_PER_UNIT"));
});

test("어느 타입의 어느 공간에서 실패했는지 알려준다", () => {
  const project = createProject();
  project.unitTypes[0].spaces[1].siteInput.widthMm = "";

  assert.throws(
    () => calculateHousingProject(project, "PER_SPACE_PER_UNIT"),
    /84A \/ 주방/,
  );
});

test("원본 입력과 기존 Snapshot을 변경하지 않는다", () => {
  const project = createProject();
  const original = structuredClone(project);

  calculateHousingProject(project, "PER_SPACE_PER_UNIT");

  assert.deepEqual(project, original);
});

test("지원하지 않는 합산 정책을 거부한다", () => {
  assert.throws(() => calculateHousingProject(createProject(), "POOLED_ORDER"));
});
