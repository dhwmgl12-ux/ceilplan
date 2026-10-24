import test from "node:test";
import assert from "node:assert/strict";

import { createRepeatedFeatures } from "../lib/feature-tools.ts";

import {
  readFeatureTemplates,
  saveFeatureTemplate,
  deleteFeatureTemplate,
} from "../lib/feature-template-storage.ts";

const room = {
  name: "거실",
  widthMm: "5000",
  lengthMm: "4000",
  shape: "RECTANGLE",
};

const source = {
  id: "original",
  type: "INSPECTION_HATCH",
  xMm: 100,
  yMm: 100,
  widthMm: 200,
  lengthMm: 200,
};

test("원본 기준으로 일정 간격에 반복 배치한다", () => {
  const before = structuredClone(source);

  const result = createRepeatedFeatures(
    room,
    source,
    {
      additionalCount: 3,
      offsetXMm: 500,
      offsetYMm: 0,
    },
    ["copy-1", "copy-2", "copy-3"],
  );

  assert.deepEqual(
    result.map((feature) => feature.xMm),
    [600, 1100, 1600],
  );

  assert.equal(result[0].type, source.type);
  assert.equal(result[0].widthMm, source.widthMm);
  assert.deepEqual(source, before);
});

test("음수 간격으로 왼쪽에 복제할 수 있다", () => {
  const result = createRepeatedFeatures(
    room,
    { ...source, xMm: 1000 },
    {
      additionalCount: 1,
      offsetXMm: -500,
      offsetYMm: 0,
    },
    ["copy-1"],
  );

  assert.equal(result[0].xMm, 500);
});

test("추가 요소가 공간 밖이면 결과를 반환하지 않는다", () => {
  assert.throws(() =>
    createRepeatedFeatures(
      room,
      source,
      {
        additionalCount: 2,
        offsetXMm: 3000,
        offsetYMm: 0,
      },
      ["copy-1", "copy-2"],
    ),
  );
});

test("ㄱ자 제외 영역에 걸치는 배치를 거부한다", () => {
  assert.throws(() =>
    createRepeatedFeatures(
      {
        ...room,
        shape: "L",
        cutoutWidthMm: "2000",
        cutoutLengthMm: "2000",
      },
      source,
      {
        additionalCount: 1,
        offsetXMm: 0,
        offsetYMm: 2500,
      },
      ["copy-1"],
    ),
  );
});

test("잘못된 개수·간격·중복 식별자를 거부한다", () => {
  for (const additionalCount of [0, -1, 1.5, 101, NaN]) {
    assert.throws(() =>
      createRepeatedFeatures(
        room,
        source,
        {
          additionalCount,
          offsetXMm: 500,
          offsetYMm: 0,
        },
        [],
      ),
    );
  }

  assert.throws(() =>
    createRepeatedFeatures(
      room,
      source,
      {
        additionalCount: 1,
        offsetXMm: 0,
        offsetYMm: 0,
      },
      ["copy-1"],
    ),
  );

  assert.throws(() =>
    createRepeatedFeatures(
      room,
      source,
      {
        additionalCount: 2,
        offsetXMm: 500,
        offsetYMm: 0,
      },
      ["same", "same"],
    ),
  );
});

function memoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("템플릿을 저장하고 불러오고 삭제한다", () => {
  const storage = memoryStorage();

  const template = {
    id: "template-1",
    name: "사용자 점검구",
    type: "INSPECTION_HATCH",
    widthMm: 450,
    lengthMm: 450,
  };

  assert.deepEqual(readFeatureTemplates(storage), []);

  saveFeatureTemplate(template, storage);

  assert.deepEqual(readFeatureTemplates(storage), [template]);

  deleteFeatureTemplate(template.id, storage);

  assert.deepEqual(readFeatureTemplates(storage), []);
});

test("같은 식별자로 저장하면 템플릿을 갱신한다", () => {
  const storage = memoryStorage();

  const template = {
    id: "template-1",
    name: "점검구",
    type: "INSPECTION_HATCH",
    widthMm: 450,
    lengthMm: 450,
  };

  saveFeatureTemplate(template, storage);
  saveFeatureTemplate({ ...template, widthMm: 600 }, storage);

  const result = readFeatureTemplates(storage);

  assert.equal(result.length, 1);
  assert.equal(result[0].widthMm, 600);
});

test("손상된 템플릿 데이터를 덮어쓰지 않는다", () => {
  let raw = "{잘못된 데이터";

  const storage = {
    getItem() {
      return raw;
    },
    setItem(_key, value) {
      raw = value;
    },
  };

  assert.throws(() =>
    saveFeatureTemplate(
      {
        id: "template-1",
        name: "점검구",
        type: "INSPECTION_HATCH",
        widthMm: 450,
        lengthMm: 450,
      },
      storage,
    ),
  );

  assert.equal(raw, "{잘못된 데이터");
});
