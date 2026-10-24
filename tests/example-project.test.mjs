import test from "node:test";
import assert from "node:assert/strict";
import { createExampleProject } from "../lib/example-project.ts";
import { calculateBase } from "../lib/calculations/base.ts";
import { exportProjectJson, importProjectJson } from "../lib/project-io.ts";

const timestamp = "2026-10-14T00:00:00.000Z";

test("예시는 실제 계산 엔진으로 검산할 수 있다", () => {
  const project = createExampleProject("example-1", timestamp);

  const result = calculateBase(project.siteInput, project.materialInput, {
    features: project.features,
    adjustments: project.adjustments,
  });

  const board = result.materials.find((item) => item.id === "BOARD");
  const mbar = result.materials.find((item) => item.id === "MBAR");
  const carrying = result.materials.find((item) => item.id === "CARRYING");

  assert.equal(result.areaM2, 12);
  assert.equal(board.orderQuantity, 11);
  assert.equal(mbar.orderQuantity, 4);
  assert.equal(carrying.orderQuantity, 3);
  assert.equal(result.totalEstimatedCost, 2800);
});

test("예시를 수정해도 다음 예시에 영향을 주지 않는다", () => {
  const first = createExampleProject("example-1", timestamp);
  const second = createExampleProject("example-2", timestamp);

  first.siteInput.name = "수정한 현장";
  first.features[0].xMm = 0;
  first.adjustments[0].quantity = 100;

  assert.equal(second.siteInput.name, "[예시] 천장 자재 산출 체험");
  assert.equal(second.features[0].xMm, 500);
  assert.equal(second.adjustments[0].quantity, 4);
});

test("예시는 계산 결과를 미리 보관하지 않는다", () => {
  const project = createExampleProject("example-1", timestamp);

  assert.equal(project.snapshot, null);
});

test("예시 프로젝트도 JSON 백업과 복원이 가능하다", () => {
  const project = createExampleProject("example-1", timestamp);

  const restored = importProjectJson(exportProjectJson(project, timestamp));

  assert.deepEqual(restored, project);
});
