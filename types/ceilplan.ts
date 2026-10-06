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

  features?: CeilingFeature[];
}

export type CeilingFeatureType =
  | "AIR_CONDITIONER"
  | "INSPECTION_HATCH"
  | "SPRINKLER"
  | "LIGHT_BOX";

export interface CeilingFeature {
  id: string;
  type: CeilingFeatureType;

  // 공간 왼쪽 상단을 기준으로 한 위치
  xMm: number;
  yMm: number;

  widthMm: number;
  lengthMm: number;
}

export const featureLabels: Record<CeilingFeatureType, string> = {
  AIR_CONDITIONER: "시스템 에어컨",
  INSPECTION_HATCH: "점검구",
  SPRINKLER: "스프링클러",
  LIGHT_BOX: "등박스",
};

export const featureColors: Record<CeilingFeatureType, string> = {
  AIR_CONDITIONER: "#0284c7",
  INSPECTION_HATCH: "#9333ea",
  SPRINKLER: "#dc2626",
  LIGHT_BOX: "#d97706",
};
