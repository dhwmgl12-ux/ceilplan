import test from "node:test";
import assert from "node:assert/strict";
import {
  createEditorHistory,
  editorHistoryReducer,
} from "../lib/editor-history.ts";

function change(state, update) {
  return editorHistoryReducer(state, {
    type: "change",
    update,
  });
}

test("변경 후 실행 취소와 다시 실행이 가능하다", () => {
  const initial = createEditorHistory({ widthMm: "4000" });

  const changed = change(initial, (previous) => ({
    ...previous,
    widthMm: "5000",
  }));

  assert.equal(changed.present.widthMm, "5000");

  const undone = editorHistoryReducer(changed, { type: "undo" });
  assert.equal(undone.present.widthMm, "4000");

  const redone = editorHistoryReducer(undone, { type: "redo" });
  assert.equal(redone.present.widthMm, "5000");
});

test("요소와 조정값의 동시 삭제를 한 번에 복원한다", () => {
  const initial = createEditorHistory({
    features: [{ id: "feature-1" }],
    adjustments: [{ id: "adjustment-1", featureId: "feature-1" }],
  });

  const deleted = change(initial, (previous) => ({
    ...previous,
    features: [],
    adjustments: [],
  }));

  const restored = editorHistoryReducer(deleted, { type: "undo" });

  assert.deepEqual(restored.present, initial.present);
  assert.equal(restored.past.length, 0);
});

test("실행 취소 후 새로운 변경은 다시 실행 이력을 지운다", () => {
  let state = createEditorHistory({ value: 1 });

  state = change(state, () => ({ value: 2 }));
  state = editorHistoryReducer(state, { type: "undo" });
  state = change(state, () => ({ value: 3 }));

  assert.equal(state.future.length, 0);

  const redone = editorHistoryReducer(state, { type: "redo" });
  assert.equal(redone.present.value, 3);
});

test("프로젝트 초기화 시 이전 편집 이력이 제거된다", () => {
  let state = createEditorHistory({ name: "이전 프로젝트" });

  state = change(state, () => ({ name: "수정한 프로젝트" }));

  state = editorHistoryReducer(state, {
    type: "reset",
    value: { name: "새 프로젝트" },
  });

  assert.equal(state.present.name, "새 프로젝트");
  assert.deepEqual(state.past, []);
  assert.deepEqual(state.future, []);
});

test("이력이 없을 때 실행 취소와 다시 실행은 상태를 유지한다", () => {
  const state = createEditorHistory({ value: 1 });

  assert.equal(editorHistoryReducer(state, { type: "undo" }), state);

  assert.equal(editorHistoryReducer(state, { type: "redo" }), state);
});

test("동일한 값으로 변경하면 이력을 추가하지 않는다", () => {
  const state = createEditorHistory({ value: 1 });

  const next = change(state, (previous) => ({ ...previous }));

  assert.equal(next, state);
});

test("편집 이력을 최대 100개로 제한한다", () => {
  let state = createEditorHistory({ value: 0 });

  for (let value = 1; value <= 105; value += 1) {
    state = change(state, () => ({ value }));
  }

  assert.equal(state.past.length, 100);

  for (let index = 0; index < 100; index += 1) {
    state = editorHistoryReducer(state, { type: "undo" });
  }

  assert.equal(state.present.value, 5);
});

test("초기 입력 객체와 변경 전 상태를 수정하지 않는다", () => {
  const original = { features: [{ id: "feature-1" }] };
  const state = createEditorHistory(original);

  original.features[0].id = "외부 변경";

  const next = change(state, (previous) => ({
    ...previous,
    features: [...previous.features, { id: "feature-2" }],
  }));

  assert.equal(state.present.features[0].id, "feature-1");
  assert.equal(state.present.features.length, 1);
  assert.equal(next.present.features.length, 2);
});
