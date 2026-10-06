export interface SiteInput {
  name: string;
  widthMm: string;
  lengthMm: string;
}

export interface MaterialInput {
  mbarSpacingMm: string;
  carryingSpacingMm: string;

  boardWidthMm: string;
  boardLengthMm: string;
  layerCount: string;

  boardLossPercent: string;
  metalLossPercent: string;

  mbarStockLengthMm: string;
  carryingStockLengthMm: string;

  boardUnitPrice: string;
  mbarUnitPrice: string;
  carryingUnitPrice: string;
}

export interface MaterialCalculation {
  id: "BOARD" | "MBAR" | "CARRYING";
  name: string;

  // 기본 물량과 Loss는 이 단위를 사용합니다.
  quantityUnit: "장" | "m";
  theoreticalQuantity: number;
  quantityBeforeLoss: number;

  // 현장 요소 계산은 아직 지원하지 않습니다.
  featureAdjustment: null;

  lossRate: number;
  lossAmount: number;
  quantityAfterLoss: number;

  // 석고는 장, 금속은 본으로 발주합니다.
  purchaseUnit: "장" | "본";
  orderQuantity: number;

  // 주문한 총 장수 또는 총길이
  orderedQuantity: number;
  roundingSurplus: number;

  unitPrice: number | null;
  estimatedCost: number | null;
}

export interface CalculationResult {
  areaM2: number;
  materials: MaterialCalculation[];

  // 단가 미입력이 하나라도 있으면 합계는 미완성입니다.
  totalEstimatedCost: number | null;
}

export interface Project {
  id: string;
  siteInput: SiteInput;
  materialInput: MaterialInput;
  updatedAt: string;
}
