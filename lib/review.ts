import type {
  Adjustment,
  CeilingFeature,
  MaterialInput,
  SiteInput,
} from "../types/ceilplan";
import { validateAdjustments, validateInputs } from "./calculations/base.ts";
import { isBoxInsideRoom, tryGetRoomGeometry } from "./geometry/room.ts";

export type ReviewLevel = "ERROR" | "CHECK" | "INFO";

export type ReviewTarget = "INPUTS" | "FEATURES" | "RESULTS" | "SAVE";

export interface ReviewItem {
  id: string;
  level: ReviewLevel;
  message: string;
  target: ReviewTarget;
}

interface ReviewInput {
  siteInput: SiteInput;
  materialInput: MaterialInput;
  features: CeilingFeature[];
  adjustments: Adjustment[];

  hasSnapshot: boolean;
  stale: boolean;
  dirty: boolean;

  // 기존 계산 처리에서 발생한 오류입니다.
  calculationErrors?: readonly string[];
}

export function collectReviewItems({
  siteInput,
  materialInput,
  features,
  adjustments,
  hasSnapshot,
  stale,
  dirty,
  calculationErrors = [],
}: ReviewInput): ReviewItem[] {
  const items: ReviewItem[] = [];

  function add(
    id: string,
    level: ReviewLevel,
    message: string,
    target: ReviewTarget,
  ) {
    // 검증과 계산 실행에서 발생한 동일한 메시지는 중복 표시하지 않습니다.
    if (
      items.some((item) => item.level === level && item.message === message)
    ) {
      return;
    }

    items.push({ id, level, message, target });
  }

  validateInputs(siteInput, materialInput).forEach((message, index) => {
    add(`input-${index}`, "ERROR", message, "INPUTS");
  });

  validateAdjustments(siteInput, features, adjustments).forEach(
    (message, index) => {
      add(`adjustment-${index}`, "ERROR", message, "FEATURES");
    },
  );

  calculationErrors.forEach((message, index) => {
    add(`calculation-${index}`, "ERROR", message, "INPUTS");
  });

  const prices = [
    ["boardUnitPrice", "석고보드"],
    ["mbarUnitPrice", "M-BAR"],
    ["carryingUnitPrice", "캐링채널"],
  ] as const;

  for (const [field, label] of prices) {
    if (!materialInput[field].trim()) {
      add(
        `price-${field}`,
        "CHECK",
        `${label} 단가가 비어 있습니다. 전체 예상 금액을 확정할 수 없습니다.`,
        "INPUTS",
      );
    }
  }

  const room = tryGetRoomGeometry(siteInput);

  if (room) {
    const outsideCount = features.filter(
      (feature) =>
        !isBoxInsideRoom(room, {
          x: feature.xMm,
          y: feature.yMm,
          width: feature.widthMm,
          length: feature.lengthMm,
        }),
    ).length;

    if (outsideCount > 0) {
      add(
        "outside-features",
        "CHECK",
        `요소 ${outsideCount}개가 공간 밖이나 제외 영역에 있습니다. 위치·크기와 연결된 조정값을 확인하세요.`,
        "FEATURES",
      );
    }
  }

  if (!hasSnapshot) {
    add(
      "not-calculated",
      "INFO",
      "아직 계산 결과가 없습니다. 입력을 확인한 뒤 계산하세요.",
      "INPUTS",
    );
  } else if (stale) {
    add(
      "stale-result",
      "CHECK",
      "표시된 계산 결과는 재계산이 필요합니다. 현재 입력의 결과로 사용하지 마세요.",
      "RESULTS",
    );
  }

  if (dirty) {
    add(
      "unsaved",
      "INFO",
      "수동 저장하지 않은 변경사항이 있습니다. 자동 임시저장과 수동 저장은 별개입니다.",
      "SAVE",
    );
  }

  return items;
}
