import test from "node:test";
import assert from "node:assert/strict";

import {
  convertSingleProject,
  exportHousingJson,
  importHousingJson,
} from "../lib/housing-io.ts";

import {
  readHousingProjects,
  saveHousingProject,
} from "../lib/housing-storage.ts";

import { exportProjectJson } from "../lib/project-io.ts";
import { createHousingReport } from "../lib/calculations/housing.ts";
import { housingReportToCsv } from "../lib/housing-csv.ts";

const timestamp = "2026-10-17T00:00:00.000Z";

function singleProject() {
  return {
    id: "single-1",
    updatedAt: timestamp,

    siteInput: {
      name: "검산 공간",
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

function housingProject() {
  const project = convertSingleProject(singleProject());
  project.unitTypes[0].unitCount = 2;
  return project;
}

function memoryStorage() {
  const data = new Map();

  return {
    data,
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
}

test("기존 프로젝트를 기본 타입·공간 하나로 변환한다", () => {
  const original = singleProject();
  const before = structuredClone(original);

  const converted = convertSingleProject(original);
  const space = converted.unitTypes[0].spaces[0];

  assert.equal(converted.unitTypes[0].unitCount, 1);
  assert.deepEqual(space.siteInput, original.siteInput);
  assert.deepEqual(space.materialInput, original.materialInput);
  assert.deepEqual(original, before);
});

test("다중 공간 JSON 왕복에서 데이터가 유지된다", () => {
  const project = housingProject();

  assert.deepEqual(
    importHousingJson(exportHousingJson(project, timestamp)),
    project,
  );
});

test("기존 단일 공간 JSON도 가져올 수 있다", () => {
  const restored = importHousingJson(
    exportProjectJson(singleProject(), timestamp),
  );

  assert.equal(restored.unitTypes.length, 1);
  assert.equal(restored.unitTypes[0].spaces.length, 1);
});

test("미완성 공간도 저장하고 복원할 수 있다", () => {
  const project = housingProject();
  project.unitTypes[0].spaces[0].siteInput.widthMm = "";

  const storage = memoryStorage();

  saveHousingProject(project, storage);

  assert.deepEqual(readHousingProjects(storage), [project]);
});

test("같은 프로젝트 저장은 중복 없이 갱신한다", () => {
  const storage = memoryStorage();
  const project = housingProject();

  saveHousingProject(project, storage);

  project.name = "수정한 프로젝트";
  saveHousingProject(project, storage);

  const restored = readHousingProjects(storage);

  assert.equal(restored.length, 1);
  assert.equal(restored[0].name, "수정한 프로젝트");
});

test("손상된 다중 공간 데이터는 덮어쓰지 않는다", () => {
  const storage = memoryStorage();

  storage.setItem("ceilplan.housing-projects.v3", "{broken");

  assert.throws(() => saveHousingProject(housingProject(), storage));

  assert.equal(storage.getItem("ceilplan.housing-projects.v3"), "{broken");
});

test("단일 공간 저장 키는 변경하지 않는다", () => {
  const storage = memoryStorage();
  const previous = JSON.stringify([singleProject()]);

  storage.setItem("ceilplan.projects.v1", previous);
  saveHousingProject(housingProject(), storage);

  assert.equal(storage.getItem("ceilplan.projects.v1"), previous);
});

test("중복 공간 ID와 잘못된 세대 수를 거부한다", () => {
  const duplicate = housingProject();
  const type = duplicate.unitTypes[0];

  type.spaces.push(structuredClone(type.spaces[0]));

  assert.throws(() => exportHousingJson(duplicate));

  const invalid = housingProject();
  invalid.unitTypes[0].unitCount = 1.5;

  assert.throws(() => exportHousingJson(invalid));
});

test("전체 CSV는 계산 당시 값과 전체 세대 수량을 사용한다", () => {
  const project = housingProject();
  const report = createHousingReport(project, timestamp);

  // 계산 후 현재 입력을 바꿔도 Report는 유지됩니다.
  project.name = "나중에 바뀐 이름";
  project.unitTypes[0].unitCount = 100;

  const csv = housingReportToCsv(report);

  assert.equal(report.result.totalEstimatedCost, 3200);
  assert.equal(report.result.totalUnitCount, 2);

  assert.ok(csv.includes('"전체 세대 발주 수량"'));
  assert.ok(csv.includes('"금액(전체 세대)"'));
  assert.ok(csv.includes('"검산 공간"'));
  assert.ok(!csv.includes("나중에 바뀐 이름"));

  // 자재 3개와 헤더 1개
  assert.equal(csv.split("\r\n").length, 4);
});

test("공간별 Snapshot도 저장·JSON 복원에서 보존한다", () => {
  const project = housingProject();
  const space = project.unitTypes[0].spaces[0];

  const report = createHousingReport(project, timestamp);

  space.snapshot = {
    calculatedAt: timestamp,
    calculationRuleVersion: "shaped-area-manual-adjustment-v1",
    siteInput: structuredClone(space.siteInput),
    materialInput: structuredClone(space.materialInput),
    features: [],
    adjustments: [],
    result: structuredClone(report.result.unitTypes[0].spaces[0].result),
  };

  const storage = memoryStorage();
  saveHousingProject(project, storage);

  assert.deepEqual(readHousingProjects(storage)[0], project);

  assert.deepEqual(importHousingJson(exportHousingJson(project)), project);
});
