export type RoomShapeType = "RECTANGLE" | "L" | "U";

export interface SiteInput {
  name: string;

  // 전체 공간을 감싸는 직사각형의 치수
  widthMm: string;
  lengthMm: string;

  // 이전 프로젝트에 없으면 직사각형으로 취급합니다.
  shape?: RoomShapeType;

  // ㄱ자·ㄷ자에서 제외되는 직사각형의 치수
  cutoutWidthMm?: string;
  cutoutLengthMm?: string;

  // ㄷ자에서 제외 영역이 시작하는 위치: 전체 공간 위쪽 기준
  cutoutTopMm?: string;
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

// 자재를 연결할 때 사용하는 공통 ID입니다.
export type MaterialId = "BOARD" | "MBAR" | "CARRYING";

export type SourceType =
  | "OFFICIAL_STANDARD"
  | "PROJECT_SPEC"
  | "MANUFACTURER"
  | "USER_INPUT";

export type SourceStatus = "CONFIRMED" | "NEEDS_REVIEW" | "INPUT_BASED";

export interface RuleSource {
  sourceType: SourceType;
  status: SourceStatus;

  // 미확인 또는 해당 없음은 null로 기록합니다.
  documentName: string | null;
  clause: string | null;
  version: string | null;
  sourceUrl: string | null;

  applicationConditions: string;
}

export type CeilingFeatureType =
  | "AIR_CONDITIONER"
  | "INSPECTION_HATCH"
  | "SPRINKLER"
  | "LIGHT_BOX";

export interface CeilingFeature {
  id: string;
  type: CeilingFeatureType;

  // 공간 왼쪽 상단을 기준으로 한 위치, 단위 mm
  xMm: number;
  yMm: number;

  widthMm: number;
  lengthMm: number;
}

export type AdjustmentType = "ADD" | "DEDUCT";

interface AdjustmentBase {
  id: string;
  featureId: string;

  // 양수로 입력합니다. 추가·공제 방향은 adjustmentType으로 구분합니다.
  quantity: number;
  adjustmentType: AdjustmentType;
  memo: string;

  // 현재 수동 조정값의 출처는 사용자 입력으로 제한합니다.
  sourceType: "USER_INPUT";
  status: "INPUT_BASED";
}

// 석고보드는 공간 면적을 입력하며 계산 시 겹수를 적용합니다.
export interface BoardAdjustment extends AdjustmentBase {
  materialId: "BOARD";
  unit: "㎡";
}

// 금속은 해당 자재의 연장을 입력합니다.
export interface MetalAdjustment extends AdjustmentBase {
  materialId: "MBAR" | "CARRYING";
  unit: "m";
}

// 자재와 단위의 잘못된 조합을 타입 수준에서 막습니다.
export type Adjustment = BoardAdjustment | MetalAdjustment;

// 계산 당시 조정값과 단위 변환 결과를 함께 보관합니다.
export interface AppliedAdjustment {
  adjustment: Adjustment;

  featureType: CeilingFeatureType;

  // 석고보드는 장, 금속은 m로 변환한 양수 수량입니다.
  convertedQuantity: number;
  quantityUnit: "장" | "m";
}

export interface FeatureAdjustmentSummary {
  // 두 합계는 모두 0 이상의 값입니다.
  addedQuantity: number;
  deductedQuantity: number;

  // 추가 합계 - 공제 합계
  netQuantity: number;

  // 자재의 이론 물량과 같은 단위입니다.
  quantityUnit: "장" | "m";

  items: AppliedAdjustment[];
}

export interface MaterialCalculation {
  id: MaterialId;
  name: string;

  quantityUnit: "장" | "m";

  // 현장 조정 전 기본 이론 물량
  theoreticalQuantity: number;

  // 기본 이론 물량 + 추가 - 공제
  quantityBeforeLoss: number;

  // null: 조정 계산 미지원
  // 합계가 0이고 items가 빈 배열: 조정 계산 지원, 입력 없음
  featureAdjustment: FeatureAdjustmentSummary | null;

  lossRate: number;
  lossAmount: number;
  quantityAfterLoss: number;

  purchaseUnit: "장" | "본";
  orderQuantity: number;

  // 발주한 총 장수 또는 총길이
  orderedQuantity: number;
  roundingSurplus: number;

  unitPrice: number | null;
  estimatedCost: number | null;
}

export interface CalculationResult {
  // 공간 외곽 형태를 반영한 면적, 현장 조정값 적용 전
  areaM2: number;

  materials: MaterialCalculation[];
  totalEstimatedCost: number | null;
}

// 저장 형식 버전과 별개로 계산 정책의 버전을 기록합니다.
export type CalculationRuleVersion = string;

export interface CalculationSnapshot {
  calculatedAt: string;
  calculationRuleVersion: CalculationRuleVersion;

  // 현재 입력에 대한 참조가 아닌 계산 당시 복사본을 보관합니다.
  siteInput: SiteInput;
  materialInput: MaterialInput;
  features: CeilingFeature[];
  adjustments: Adjustment[];

  result: CalculationResult;
}

// 기존 화면과 저장 코드가 계속 사용할 프로젝트 타입입니다.
export interface Project {
  id: string;
  siteInput: SiteInput;
  materialInput: MaterialInput;
  updatedAt: string;

  // 이전 데이터 및 단계적 구현과의 호환을 위해 선택 항목입니다.
  features?: CeilingFeature[];
  adjustments?: Adjustment[];
  snapshot?: CalculationSnapshot | null;
}

// 앞으로 새 저장 형식으로 기록할 프로젝트입니다.
export interface StoredProjectV2 extends Project {
  features: CeilingFeature[];
  adjustments: Adjustment[];
  snapshot: CalculationSnapshot | null;
}

// JSON 및 브라우저 저장 데이터의 형식 버전입니다.
// 공식 기준의 버전을 의미하지 않습니다.
export const PROJECT_SCHEMA_VERSION = 2 as const;

// 브라우저에 저장할 프로젝트 목록의 새 형식
export interface ProjectStorageV2 {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  projects: StoredProjectV2[];
}

// 프로젝트 1개를 백업할 JSON 파일의 새 형식
export interface ProjectExportV2 {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  exportedAt: string;
  project: StoredProjectV2;
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
