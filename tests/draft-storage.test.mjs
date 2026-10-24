import test from "node:test";
import assert from "node:assert/strict";

import {
  parseDraft,
  replaceDraft,
  serializeDraft,
} from "../lib/draft-storage.ts";

function memoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function normalize(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.name !== "string"
  ) {
    throw new Error("잘못된 입력");
  }

  return { name: value.name };
}

test("작성 중인 빈 문자열도 보존한다", () => {
  const raw = serializeDraft({ name: "" }, "2026-10-24T00:00:00.000Z");

  const restored = parseDraft(raw, normalize);

  assert.deepEqual(restored.data, { name: "" });
  assert.equal(restored.schemaVersion, 1);
});

test("임시저장 데이터를 기록하고 갱신하고 삭제한다", () => {
  const storage = memoryStorage();

  const first = serializeDraft({ name: "처음" });
  replaceDraft("draft", null, first, storage);

  const second = serializeDraft({ name: "수정" });
  replaceDraft("draft", first, second, storage);

  assert.deepEqual(parseDraft(storage.getItem("draft"), normalize).data, {
    name: "수정",
  });

  replaceDraft("draft", second, null, storage);

  assert.equal(storage.getItem("draft"), null);
});

test("다른 탭의 변경을 덮어쓰거나 삭제하지 않는다", () => {
  const storage = memoryStorage();

  storage.setItem("draft", "다른 탭의 데이터");

  assert.throws(() => replaceDraft("draft", null, "현재 탭의 데이터", storage));

  assert.throws(() => replaceDraft("draft", "이전 데이터", null, storage));

  assert.equal(storage.getItem("draft"), "다른 탭의 데이터");
});

test("손상된 데이터와 지원하지 않는 버전을 거부한다", () => {
  assert.throws(() => parseDraft("{", normalize));

  assert.throws(() =>
    parseDraft(
      JSON.stringify({
        schemaVersion: 99,
        savedAt: "2026-10-24T00:00:00.000Z",
        data: { name: "거실" },
      }),
      normalize,
    ),
  );
});

test("외부 입력 검증에 실패하면 복구하지 않는다", () => {
  const raw = serializeDraft({ name: 123 });

  assert.throws(() => parseDraft(raw, normalize));
});

test("임시저장이 수동 저장 데이터를 변경하지 않는다", () => {
  const storage = memoryStorage();

  storage.setItem("manual-projects", "수동 저장본");

  const raw = serializeDraft({ name: "작성 중" });
  replaceDraft("draft", null, raw, storage);
  replaceDraft("draft", raw, null, storage);

  assert.equal(storage.getItem("manual-projects"), "수동 저장본");
});
