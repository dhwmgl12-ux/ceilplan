import type { CeilingFeature, SiteInput } from "../types/ceilplan";
import { getRoomGeometry, isBoxInsideRoom } from "./geometry/room.ts";

// 한 번에 생성하는 요소 수의 제품 제한입니다.
// 시공 기준이 아닙니다.
export const MAX_REPEAT_COUNT = 100;

export interface RepeatFeatureOptions {
  additionalCount: number;
  offsetXMm: number;
  offsetYMm: number;
}

export function createRepeatedFeatures(
  inputs: SiteInput,
  source: CeilingFeature,
  options: RepeatFeatureOptions,
  ids: readonly string[],
): CeilingFeature[] {
  const { additionalCount, offsetXMm, offsetYMm } = options;

  if (
    !Number.isInteger(additionalCount) ||
    additionalCount < 1 ||
    additionalCount > MAX_REPEAT_COUNT
  ) {
    throw new Error(
      `추가 개수는 1~${MAX_REPEAT_COUNT} 사이의 정수로 입력하세요.`,
    );
  }

  if (![offsetXMm, offsetYMm].every(Number.isFinite)) {
    throw new Error("이동 간격에 올바른 숫자를 입력하세요.");
  }

  if (offsetXMm === 0 && offsetYMm === 0) {
    throw new Error("X 또는 Y 이동 간격을 입력하세요.");
  }

  if (
    ids.length !== additionalCount ||
    ids.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(ids).size !== ids.length ||
    ids.includes(source.id)
  ) {
    throw new Error("새 요소의 식별자가 올바르지 않습니다.");
  }

  const room = getRoomGeometry(inputs);

  if (
    !isBoxInsideRoom(room, {
      x: source.xMm,
      y: source.yMm,
      width: source.widthMm,
      length: source.lengthMm,
    })
  ) {
    throw new Error("원본 요소가 공간 안에 있는지 확인하세요.");
  }

  return ids.map((id, index) => {
    const step = index + 1;

    const feature: CeilingFeature = {
      ...source,
      id,
      xMm: source.xMm + offsetXMm * step,
      yMm: source.yMm + offsetYMm * step,
    };

    if (
      !isBoxInsideRoom(room, {
        x: feature.xMm,
        y: feature.yMm,
        width: feature.widthMm,
        length: feature.lengthMm,
      })
    ) {
      throw new Error(
        `${step}번째 추가 요소가 공간 밖이나 제외 영역에 걸칩니다. 아무 요소도 추가하지 않았습니다.`,
      );
    }

    return feature;
  });
}
