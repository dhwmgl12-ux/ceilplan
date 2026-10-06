import type {
  CalculationResult,
  MaterialCalculation,
  MaterialInput,
  SiteInput,
} from "../../types/ceilplan";

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
): MaterialCalculation {
  const boardAreaM2 =
    (Number(input.boardWidthMm) / 1000) * (Number(input.boardLengthMm) / 1000);

  const theoreticalQuantity = (areaM2 / boardAreaM2) * Number(input.layerCount);

  const lossRate = Number(input.boardLossPercent);
  const { quantityAfterLoss, lossAmount } = applyLoss(
    theoreticalQuantity,
    lossRate,
  );

  const orderQuantity = ceilOrderQuantity(quantityAfterLoss);
  const unitPrice = parsePrice(input.boardUnitPrice);

  return {
    id: "BOARD",
    name: "석고보드",
    quantityUnit: "장",
    theoreticalQuantity,
    quantityBeforeLoss: theoreticalQuantity,
    featureAdjustment: null,
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
}

function calculateMetal({
  id,
  name,
  areaM2,
  spacingMm,
  stockLengthMm,
  lossRate,
  unitPrice,
}: MetalOptions): MaterialCalculation {
  const spacingM = spacingMm / 1000;
  const stockLengthM = stockLengthMm / 1000;

  const theoreticalQuantity = areaM2 / spacingM;
  const { quantityAfterLoss, lossAmount } = applyLoss(
    theoreticalQuantity,
    lossRate,
  );

  const orderQuantity = ceilOrderQuantity(quantityAfterLoss / stockLengthM);

  const orderedQuantity = orderQuantity * stockLengthM;

  return {
    id,
    name,
    quantityUnit: "m",
    theoreticalQuantity,
    quantityBeforeLoss: theoreticalQuantity,
    featureAdjustment: null,
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
): CalculationResult {
  const errors = validateInputs(site, input);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  // 현장 요소 공제 전, 직사각형 전체 면적입니다.
  const areaM2 = (Number(site.widthMm) / 1000) * (Number(site.lengthMm) / 1000);

  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    throw new Error("공간 면적이 계산 가능한 범위를 벗어났습니다.");
  }

  const materials: MaterialCalculation[] = [
    calculateBoard(areaM2, input),

    calculateMetal({
      id: "MBAR",
      name: "M-BAR",
      areaM2,
      spacingMm: Number(input.mbarSpacingMm),
      stockLengthMm: Number(input.mbarStockLengthMm),
      lossRate: Number(input.metalLossPercent),
      unitPrice: parsePrice(input.mbarUnitPrice),
    }),

    calculateMetal({
      id: "CARRYING",
      name: "캐링채널",
      areaM2,
      spacingMm: Number(input.carryingSpacingMm),
      stockLengthMm: Number(input.carryingStockLengthMm),
      lossRate: Number(input.metalLossPercent),
      unitPrice: parsePrice(input.carryingUnitPrice),
    }),
  ];

  for (const material of materials) {
    const quantities = [
      material.theoreticalQuantity,
      material.quantityAfterLoss,
      material.orderedQuantity,
      material.lossAmount,
      material.roundingSurplus,
    ];

    if (
      !quantities.every(Number.isFinite) ||
      material.theoreticalQuantity <= 0 ||
      !Number.isSafeInteger(material.orderQuantity) ||
      material.orderQuantity <= 0 ||
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
