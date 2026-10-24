import type { MaterialInput } from "../types/ceilplan";
import type { UserPriceEntry } from "../types/user-material";

const STORAGE_KEY = "ceilplan.user-price-entries.v1";

type PriceStorage = Pick<Storage, "getItem" | "setItem">;

function isPriceEntry(value: unknown): value is UserPriceEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  if (
    typeof item.id !== "string" ||
    !item.id.trim() ||
    typeof item.name !== "string" ||
    !item.name.trim() ||
    typeof item.unit !== "string" ||
    !item.unit.trim() ||
    typeof item.memo !== "string" ||
    typeof item.unitPrice !== "string" ||
    !item.unitPrice.trim()
  ) {
    return false;
  }

  const price = Number(item.unitPrice);

  if (!Number.isFinite(price) || price < 0) {
    return false;
  }

  return (
    (item.target === "BOARD" && item.unit === "장") ||
    ((item.target === "MBAR" || item.target === "CARRYING") &&
      item.unit === "본") ||
    item.target === "EXTRA"
  );
}

export function readUserPrices(
  storage: Pick<Storage, "getItem"> = localStorage,
): UserPriceEntry[] {
  const raw = storage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  const value: unknown = JSON.parse(raw);

  if (typeof value !== "object" || value === null) {
    throw new Error("사용자 단가표 형식을 확인하세요.");
  }

  const data = value as Record<string, unknown>;

  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.entries) ||
    !data.entries.every(isPriceEntry)
  ) {
    throw new Error("사용자 단가표 항목을 확인하세요.");
  }

  if (
    new Set(data.entries.map((entry) => entry.id)).size !== data.entries.length
  ) {
    throw new Error("사용자 단가표 식별자가 중복되었습니다.");
  }

  return structuredClone(data.entries);
}

function writeEntries(entries: UserPriceEntry[], storage: PriceStorage) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      entries,
    }),
  );
}

export function saveUserPrice(
  entry: UserPriceEntry,
  storage: PriceStorage = localStorage,
): UserPriceEntry[] {
  if (!isPriceEntry(entry)) {
    throw new Error("자재명·구매 단위·단가를 확인하세요.");
  }

  // 기존 데이터가 손상됐다면 덮어쓰지 않습니다.
  const previous = readUserPrices(storage);

  const next = [
    structuredClone(entry),
    ...previous.filter((item) => item.id !== entry.id),
  ];

  writeEntries(next, storage);

  return next;
}

export function deleteUserPrice(
  id: string,
  storage: PriceStorage = localStorage,
): UserPriceEntry[] {
  const previous = readUserPrices(storage);
  const next = previous.filter((entry) => entry.id !== id);

  writeEntries(next, storage);

  return next;
}

// 사용자가 명시적으로 적용한 항목 하나만 입력에 복사합니다.
// 단가표와 프로젝트 입력을 실시간으로 연결하지 않습니다.
export function applyStandardPrice(
  input: MaterialInput,
  entry: UserPriceEntry,
): MaterialInput {
  if (!isPriceEntry(entry)) {
    throw new Error("적용할 단가표 항목이 올바르지 않습니다.");
  }

  switch (entry.target) {
    case "BOARD":
      return {
        ...input,
        boardUnitPrice: entry.unitPrice,
      };

    case "MBAR":
      return {
        ...input,
        mbarUnitPrice: entry.unitPrice,
      };

    case "CARRYING":
      return {
        ...input,
        carryingUnitPrice: entry.unitPrice,
      };

    case "EXTRA":
      throw new Error("기타 자재 단가는 기타 자재 입력 화면에서 적용하세요.");
  }
}
