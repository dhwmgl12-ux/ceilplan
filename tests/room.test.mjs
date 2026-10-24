import test from "node:test";
import assert from "node:assert/strict";
import { getRoomGeometry, isBoxInsideRoom } from "../lib/geometry/room.ts";

const site = {
  name: "공간 형태 검산",
  widthMm: "6000",
  lengthMm: "4000",
};

test("형태 정보가 없는 이전 입력은 직사각형이다", () => {
  const room = getRoomGeometry(site);

  assert.equal(room.shape, "RECTANGLE");
  assert.equal(room.areaM2, 24);
  assert.equal(room.points.length, 4);
});

test("ㄱ자는 왼쪽 아래 제외 면적을 반영한다", () => {
  const room = getRoomGeometry({
    ...site,
    shape: "L",
    cutoutWidthMm: "2000",
    cutoutLengthMm: "1000",
  });

  assert.equal(room.areaM2, 22);
  assert.equal(room.points.length, 6);

  assert.equal(
    isBoxInsideRoom(room, {
      x: 500,
      y: 3200,
      width: 500,
      length: 500,
    }),
    false,
  );

  assert.equal(
    isBoxInsideRoom(room, {
      x: 2500,
      y: 3200,
      width: 500,
      length: 500,
    }),
    true,
  );
});

test("ㄷ자는 오른쪽 중간 제외 면적을 반영한다", () => {
  const room = getRoomGeometry({
    ...site,
    shape: "U",
    cutoutWidthMm: "2000",
    cutoutLengthMm: "2000",
    cutoutTopMm: "1000",
  });

  assert.equal(room.areaM2, 20);
  assert.equal(room.points.length, 8);
});

test("ㄷ자의 홈을 가로지르는 요소는 허용하지 않는다", () => {
  const room = getRoomGeometry({
    ...site,
    shape: "U",
    cutoutWidthMm: "2000",
    cutoutLengthMm: "2000",
    cutoutTopMm: "1000",
  });

  assert.equal(
    isBoxInsideRoom(room, {
      x: 4500,
      y: 500,
      width: 500,
      length: 3000,
    }),
    false,
  );
});

test("제외 영역 경계에 닿기만 하는 요소는 허용한다", () => {
  const room = getRoomGeometry({
    ...site,
    shape: "U",
    cutoutWidthMm: "2000",
    cutoutLengthMm: "2000",
    cutoutTopMm: "1000",
  });

  assert.equal(
    isBoxInsideRoom(room, {
      x: 3500,
      y: 1500,
      width: 500,
      length: 500,
    }),
    true,
  );
});

test("잘못된 형태와 치수는 거부한다", () => {
  for (const change of [
    { shape: "UNKNOWN" },
    {
      shape: "L",
      cutoutWidthMm: "6000",
      cutoutLengthMm: "1000",
    },
    {
      shape: "L",
      cutoutWidthMm: "",
      cutoutLengthMm: "1000",
    },
    {
      shape: "U",
      cutoutWidthMm: "2000",
      cutoutLengthMm: "2000",
      cutoutTopMm: "2000",
    },
    {
      shape: "U",
      cutoutWidthMm: "2000",
      cutoutLengthMm: "2000",
      cutoutTopMm: "0",
    },
  ]) {
    assert.throws(() => getRoomGeometry({ ...site, ...change }));
  }
});
