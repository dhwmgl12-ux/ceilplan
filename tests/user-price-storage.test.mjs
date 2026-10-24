import test from "node:test";
import assert from "node:assert/strict";

import {
  applyStandardPrice,
  deleteUserPrice,
  readUserPrices,
  saveUserPrice,
} from "../lib/user-price-storage.ts";

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

function entry(overrides = {}) {
  return {
    id: "price-1",
    name: "거래처 A M-BAR 4m",
    target: "MBAR",
    unit: "본",
    unitPrice: "3200",
    memo: "사용자 등록 가격",
    ...overrides,
  };
}

test("단가표 항목을 저장·수정·삭제한다", () => {
  const storage = memoryStorage();

  saveUserPrice(entry(), storage);

  assert.equal(readUserPrices(storage)[0].unitPrice, "3200");

  saveUserPrice(entry({ unitPrice: "3500" }), storage);

  assert.equal(readUserPrices(storage).length, 1);
  assert.equal(readUserPrices(storage)[0].unitPrice, "3500");

  deleteUserPrice("price-1", storage);

  assert.deepEqual(readUserPrices(storage), []);
});

test("0원은 저장하고 단가 공란은 거부한다", () => {
  const storage = memoryStorage();

  saveUserPrice(entry({ unitPrice: "0" }), storage);

  assert.equal(readUserPrices(storage)[0].unitPrice, "0");

  assert.throws(() => saveUserPrice(entry({ unitPrice: "" }), storage));
});

test("자동 산출 자재의 잘못된 구매 단위를 거부한다", () => {
  const storage = memoryStorage();

  assert.throws(() => saveUserPrice(entry({ unit: "m" }), storage));
});

test("단가 적용은 입력 복사본을 반환한다", () => {
  const input = {
    mbarUnitPrice: "100",
    boardUnitPrice: "200",
    carryingUnitPrice: "300",
  };

  const result = applyStandardPrice(input, entry());

  assert.equal(result.mbarUnitPrice, "3200");
  assert.equal(input.mbarUnitPrice, "100");

  assert.equal(result.boardUnitPrice, "200");
  assert.equal(result.carryingUnitPrice, "300");
});

test("기타 자재 단가를 자동 산출 자재에 적용하지 않는다", () => {
  assert.throws(() =>
    applyStandardPrice(
      {},
      entry({
        target: "EXTRA",
        unit: "봉",
      }),
    ),
  );
});

test("손상된 단가표를 덮어쓰지 않는다", () => {
  let raw = "{손상된 데이터";

  const storage = {
    getItem() {
      return raw;
    },
    setItem(_key, value) {
      raw = value;
    },
  };

  assert.throws(() => saveUserPrice(entry(), storage));

  assert.equal(raw, "{손상된 데이터");
});
