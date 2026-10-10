import type {
  Adjustment,
  CalculationResult,
  CeilingFeature,
  FeatureAdjustmentSummary,
  MaterialCalculation,
  MaterialId,
  MaterialInput,
  SiteInput,
} from "../../types/ceilplan";

export interface CalculationOptions {
  features?: CeilingFeature[];
  adjustments?: Adjustment[];
}

type PositiveField =
  | "widthMm"
  | "lengthMm"
  | "mbarSpacingMm"
  | "carryingSpacingMm"
  | "boardWidthMm"
  | "boardLengthMm"
  | "layerCount"
  | "mbarStockLengthMm"
  | "carryingStockLengthMm";

const positiveFields: Record<PositiveField, string> = {
  widthMm: "공간 가로",
  lengthMm: "공간 세로",
  mbarSpacingMm: "M-BAR 간격",
  carryingSpacingMm: "캐링 간격",
  boardWidthMm: "석고보드 가로",
  boardLengthMm: "석고보드 세로",
  layerCount: "석고보드 겹수",
  mbarStockLengthMm: "M-BAR 정척 길이",
  carryingStockLengthMm: "캐링 정척 길이",
};

const lossFields = {
  boardLossPercent: "석고보드 Loss",
  metalLossPercent: "금속 자재 Loss",
} as const;

const priceFields = {
  boardUnitPrice: "석고보드 단가",
  mbarUnitPrice: "M-BAR 단가",
  carryingUnitPrice: "캐링채널 단가",
} as const;

export function validateInputs(
  site: SiteInput,
  material: MaterialInput,
): string[] {
  const errors: string[] = [];
  const inputs = { ...site, ...material };

  if (!site.name.trim()) {
    errors.push("현장명을 입력해 주세요.");
  }

  for (const field of Object.keys(positiveFields) as PositiveField[]) {
    const raw = inputs[field];
    const value = Number(raw);

    if (!raw.trim() || !Number.isFinite(value) || value <= 0) {
      errors.push(`${positiveFields[field]}에 0보다 큰 숫자를 입력하세요.`);
    }
  }

  const layers = Number(material.layerCount);

  if (
    material.layerCount.trim() &&
    Number.isFinite(layers) &&
    layers > 0 &&
    !Number.isSafeInteger(layers)
  ) {
    errors.push("석고보드 겹수는 양의 정수로 입력하세요.");
  }

  for (const field of Object.keys(lossFields) as (keyof typeof lossFields)[]) {
    const raw = material[field];
    const value = Number(raw);

    if (!raw.trim() || !Number.isFinite(value) || value < 0) {
      errors.push(`${lossFields[field]}에 0 이상의 숫자를 입력하세요.`);
    }
  }

  for (const field of Object.keys(
    priceFields,
  ) as (keyof typeof priceFields)[]) {
    const raw = material[field];

    // 단가 미입력은 허용합니다.
    if (!raw.trim()) continue;

    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      errors.push(`${priceFields[field]}에 0 이상의 숫자를 입력하세요.`);
    }
  }

  return errors;
}
export function validateAdjustments(
  site: SiteInput,
  features: CeilingFeature[],
  adjustments: Adjustment[],
): string[] {
  const errors: string[] = [];
  const featureMap = new Map(features.map((feature) => [feature.id, feature]));

  if (featureMap.size !== features.length) {
    errors.push("현장 요소 ID가 중복되어 있습니다.");
  }

  const adjustmentIds = new Set<string>();
  const roomWidth = Number(site.widthMm);
  const roomLength = Number(site.lengthMm);

  for (const adjustment of adjustments) {
    const label = adjustment.id || "ID 없음";

    if (!adjustment.id.trim()) {
      errors.push("조정값 ID가 비어 있습니다.");
    }

    if (adjustmentIds.has(adjustment.id)) {
      errors.push(`조정값 ID가 중복되어 있습니다: ${label}`);
    }

    adjustmentIds.add(adjustment.id);

    if (
      adjustment.adjustmentType !== "ADD" &&
      adjustment.adjustmentType !== "DEDUCT"
    ) {
      errors.push(`${label}: 추가 또는 공제를 선택하세요.`);
    }

    if (!Number.isFinite(adjustment.quantity) || adjustment.quantity <= 0) {
      errors.push(`${label}: 조정 수량은 0보다 큰 숫자여야 합니다.`);
    }

    if (!adjustment.memo.trim()) {
      errors.push(`${label}: 조정 사유를 입력하세요.`);
    }

    if (
      adjustment.sourceType !== "USER_INPUT" ||
      adjustment.status !== "INPUT_BASED"
    ) {
      errors.push(`${label}: 현재 조정값은 사용자 입력만 지원합니다.`);
    }

    if (adjustment.materialId === "BOARD") {
      if (adjustment.unit !== "㎡") {
        errors.push(`${label}: 석고보드 조정 단위는 ㎡입니다.`);
      }
    } else if (
      adjustment.materialId === "MBAR" ||
      adjustment.materialId === "CARRYING"
    ) {
      if (adjustment.unit !== "m") {
        errors.push(`${label}: 금속 자재 조정 단위는 m입니다.`);
      }
    } else {
      errors.push(`${label}: 지원하지 않는 자재입니다.`);
    }

    const feature = featureMap.get(adjustment.featureId);

    if (!feature) {
      errors.push(`${label}: 연결된 현장 요소를 찾을 수 없습니다.`);
      continue;
    }

    const validType = [
      "AIR_CONDITIONER",
      "INSPECTION_HATCH",
      "SPRINKLER",
      "LIGHT_BOX",
    ].includes(feature.type);

    const validDimensions =
      [feature.xMm, feature.yMm, feature.widthMm, feature.lengthMm].every(
        Number.isFinite,
      ) &&
      feature.xMm >= 0 &&
      feature.yMm >= 0 &&
      feature.widthMm > 0 &&
      feature.lengthMm > 0;

    if (!validType || !validDimensions) {
      errors.push(`${label}: 연결된 현장 요소의 정보가 올바르지 않습니다.`);
      continue;
    }

    if (
      feature.xMm + feature.widthMm > roomWidth ||
      feature.yMm + feature.lengthMm > roomLength
    ) {
      errors.push(`${label}: 연결된 현장 요소가 공간 밖에 있습니다.`);
    }
  }

  return errors;
}

function summarizeAdjustments(
  materialId: MaterialId,
  input: MaterialInput,
  features: CeilingFeature[],
  adjustments: Adjustment[],
): FeatureAdjustmentSummary {
  const quantityUnit = materialId === "BOARD" ? "장" : "m";

  const summary: FeatureAdjustmentSummary = {
    addedQuantity: 0,
    deductedQuantity: 0,
    netQuantity: 0,
    quantityUnit,
    items: [],
  };

  const featureMap = new Map(features.map((feature) => [feature.id, feature]));

  const boardAreaM2 =
    (Number(input.boardWidthMm) / 1000) * (Number(input.boardLengthMm) / 1000);

  for (const adjustment of adjustments) {
    if (adjustment.materialId !== materialId) continue;

    const feature = featureMap.get(adjustment.featureId);

    if (!feature) {
      throw new Error("조정값에 연결된 현장 요소를 찾을 수 없습니다.");
    }

    // 석고보드는 공간 면적을 장수로 변환하며 겹수를 적용합니다.
    const convertedQuantity =
      materialId === "BOARD"
        ? (adjustment.quantity / boardAreaM2) * Number(input.layerCount)
        : adjustment.quantity;

    if (!Number.isFinite(convertedQuantity) || convertedQuantity <= 0) {
      throw new Error("조정 수량이 계산 가능한 범위를 벗어났습니다.");
    }

    if (adjustment.adjustmentType === "ADD") {
      summary.addedQuantity += convertedQuantity;
    } else {
      summary.deductedQuantity += convertedQuantity;
    }

    summary.items.push({
      adjustment: { ...adjustment },
      featureType: feature.type,
      convertedQuantity,
      quantityUnit,
    });
  }

  summary.netQuantity = summary.addedQuantity - summary.deductedQuantity;

  if (
    ![
      summary.addedQuantity,
      summary.deductedQuantity,
      summary.netQuantity,
    ].every(Number.isFinite)
  ) {
    throw new Error("조정 합계가 계산 가능한 범위를 벗어났습니다.");
  }

  return summary;
}

function applyAdjustments(
  name: string,
  theoreticalQuantity: number,
  summary: FeatureAdjustmentSummary,
): number {
  const quantityBeforeLoss = theoreticalQuantity + summary.netQuantity;

  if (!Number.isFinite(quantityBeforeLoss)) {
    throw new Error(`${name} 조정 후 물량이 계산 범위를 벗어났습니다.`);
  }

  if (quantityBeforeLoss < 0) {
    throw new Error(`${name}의 공제 수량이 사용 가능한 물량을 초과합니다.`);
  }

  return quantityBeforeLoss;
}

function parsePrice(raw: string): number | null {
  return raw.trim() === "" ? null : Number(raw);
}

// 소수 연산 오차 때문에 정확한 정수에서 1개 더 발주되는 것을 방지합니다.
// 시공 허용 오차가 아니라 JavaScript 숫자 연산의 오차 처리입니다.
function ceilOrderQuantity(value: number): number {
  const nearestInteger = Math.round(value);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 8;

  if (nearestInteger > 0 && Math.abs(value - nearestInteger) <= tolerance) {
    return nearestInteger;
  }

  return Math.ceil(value);
}

function applyLoss(theoreticalQuantity: number, lossRate: number) {
  const quantityAfterLoss = theoreticalQuantity * (1 + lossRate / 100);

  return {
    quantityAfterLoss,
    lossAmount: quantityAfterLoss - theoreticalQuantity,
  };
}

function calculateBoard(
  areaM2: number,
  input: MaterialInput,
  featureAdjustment: FeatureAdjustmentSummary,
): MaterialCalculation {
  const boardAreaM2 =
    (Number(input.boardWidthMm) / 1000) * (Number(input.boardLengthMm) / 1000);

  const theoreticalQuantity = (areaM2 / boardAreaM2) * Number(input.layerCount);

  const quantityBeforeLoss = applyAdjustments(
    "석고보드",
    theoreticalQuantity,
    featureAdjustment,
  );

  const lossRate = Number(input.boardLossPercent);
  const { quantityAfterLoss, lossAmount } = applyLoss(
    quantityBeforeLoss,
    lossRate,
  );

  const orderQuantity = ceilOrderQuantity(quantityAfterLoss);
  const unitPrice = parsePrice(input.boardUnitPrice);

  return {
    id: "BOARD",
    name: "석고보드",
    quantityUnit: "장",
    theoreticalQuantity,
    quantityBeforeLoss,
    featureAdjustment,
    lossRate,
    lossAmount,
    quantityAfterLoss,
    purchaseUnit: "장",
    orderQuantity,
    orderedQuantity: orderQuantity,
    roundingSurplus: Math.max(0, orderQuantity - quantityAfterLoss),
    unitPrice,
    estimatedCost: unitPrice === null ? null : orderQuantity * unitPrice,
  };
}

interface MetalOptions {
  id: "MBAR" | "CARRYING";
  name: string;
  areaM2: number;
  spacingMm: number;
  stockLengthMm: number;
  lossRate: number;
  unitPrice: number | null;
  featureAdjustment: FeatureAdjustmentSummary;
}

function calculateMetal({
  id,
  name,
  areaM2,
  spacingMm,
  stockLengthMm,
  lossRate,
  unitPrice,
  featureAdjustment,
}: MetalOptions): MaterialCalculation {
  const spacingM = spacingMm / 1000;
  const stockLengthM = stockLengthMm / 1000;

  const theoreticalQuantity = areaM2 / spacingM;

  const quantityBeforeLoss = applyAdjustments(
    name,
    theoreticalQuantity,
    featureAdjustment,
  );

  const { quantityAfterLoss, lossAmount } = applyLoss(
    quantityBeforeLoss,
    lossRate,
  );

  const orderQuantity = ceilOrderQuantity(quantityAfterLoss / stockLengthM);

  const orderedQuantity = orderQuantity * stockLengthM;

  return {
    id,
    name,
    quantityUnit: "m",
    theoreticalQuantity,
    quantityBeforeLoss,
    featureAdjustment,
    lossRate,
    lossAmount,
    quantityAfterLoss,
    purchaseUnit: "본",
    orderQuantity,
    orderedQuantity,
    roundingSurplus: Math.max(0, orderedQuantity - quantityAfterLoss),
    unitPrice,
    estimatedCost: unitPrice === null ? null : orderQuantity * unitPrice,
  };
}

export function calculateBase(
  site: SiteInput,
  input: MaterialInput,
  options: CalculationOptions = {},
): CalculationResult {
  const features = options.features ?? [];
  const adjustments = options.adjustments ?? [];

  const errors = [
    ...validateInputs(site, input),
    ...validateAdjustments(site, features, adjustments),
  ];

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const areaM2 = (Number(site.widthMm) / 1000) * (Number(site.lengthMm) / 1000);

  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    throw new Error("공간 면적이 계산 가능한 범위를 벗어났습니다.");
  }

  const summarize = (materialId: MaterialId) =>
    summarizeAdjustments(materialId, input, features, adjustments);

  const materials: MaterialCalculation[] = [
    calculateBoard(areaM2, input, summarize("BOARD")),

    calculateMetal({
      id: "MBAR",
      name: "M-BAR",
      areaM2,
      spacingMm: Number(input.mbarSpacingMm),
      stockLengthMm: Number(input.mbarStockLengthMm),
      lossRate: Number(input.metalLossPercent),
      unitPrice: parsePrice(input.mbarUnitPrice),
      featureAdjustment: summarize("MBAR"),
    }),

    calculateMetal({
      id: "CARRYING",
      name: "캐링채널",
      areaM2,
      spacingMm: Number(input.carryingSpacingMm),
      stockLengthMm: Number(input.carryingStockLengthMm),
      lossRate: Number(input.metalLossPercent),
      unitPrice: parsePrice(input.carryingUnitPrice),
      featureAdjustment: summarize("CARRYING"),
    }),
  ];

  for (const material of materials) {
    const quantities = [
      material.theoreticalQuantity,
      material.quantityBeforeLoss,
      material.quantityAfterLoss,
      material.orderedQuantity,
      material.lossAmount,
      material.roundingSurplus,
    ];

    if (
      !quantities.every(Number.isFinite) ||
      material.theoreticalQuantity <= 0 ||
      material.quantityBeforeLoss < 0 ||
      !Number.isSafeInteger(material.orderQuantity) ||
      material.orderQuantity < 0 ||
      (material.estimatedCost !== null &&
        !Number.isFinite(material.estimatedCost))
    ) {
      throw new Error(
        `${material.name} 계산값이 처리 가능한 범위를 벗어났습니다.`,
      );
    }
  }

  let totalEstimatedCost: number | null = 0;

  for (const material of materials) {
    if (material.estimatedCost === null) {
      totalEstimatedCost = null;
      break;
    }

    totalEstimatedCost += material.estimatedCost;
  }

  if (totalEstimatedCost !== null && !Number.isFinite(totalEstimatedCost)) {
    throw new Error("합계 금액이 처리 가능한 범위를 벗어났습니다.");
  }

  return {
    areaM2,
    materials,
    totalEstimatedCost,
  };
}
