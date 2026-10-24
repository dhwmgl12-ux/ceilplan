export interface DraftEnvelope<T> {
  schemaVersion: 1;
  savedAt: string;
  data: T;
}

export const SINGLE_DRAFT_KEY = "ceilplan.single-draft.v1";
export const HOUSING_DRAFT_KEY = "ceilplan.housing-draft.v1";

export function parseDraft<T>(
  raw: string,
  normalize: (value: unknown) => T,
): DraftEnvelope<T> {
  const value: unknown = JSON.parse(raw);

  if (typeof value !== "object" || value === null) {
    throw new Error("임시저장 형식이 올바르지 않습니다.");
  }

  const item = value as Record<string, unknown>;

  if (
    item.schemaVersion !== 1 ||
    typeof item.savedAt !== "string" ||
    !Number.isFinite(Date.parse(item.savedAt))
  ) {
    throw new Error("임시저장 버전 또는 저장 시각을 확인하세요.");
  }

  return {
    schemaVersion: 1,
    savedAt: item.savedAt,
    data: normalize(item.data),
  };
}

export function serializeDraft<T>(
  data: T,
  savedAt = new Date().toISOString(),
): string {
  if (!Number.isFinite(Date.parse(savedAt))) {
    throw new Error("임시저장 시각이 올바르지 않습니다.");
  }

  return JSON.stringify({
    schemaVersion: 1,
    savedAt,
    data,
  } satisfies DraftEnvelope<T>);
}

// 읽었던 데이터와 현재 데이터가 다르면 다른 탭의 변경으로 판단합니다.
export function replaceDraft(
  key: string,
  expected: string | null,
  next: string | null,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
) {
  if (storage.getItem(key) !== expected) {
    throw new Error(
      "다른 탭에서 임시저장이 변경되었습니다. 현재 탭의 자동 임시저장을 중단했습니다. 필요한 작업을 수동 저장한 뒤 새로고침하세요.",
    );
  }

  if (next === null) {
    storage.removeItem(key);
  } else {
    storage.setItem(key, next);
  }
}
