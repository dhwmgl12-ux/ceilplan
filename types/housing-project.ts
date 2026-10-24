import type {
  Adjustment,
  CalculationResult,
  CalculationSnapshot,
  CeilingFeature,
  MaterialCalculation,
  MaterialInput,
  SiteInput,
} from "./ceilplan";

// 공간마다 독립적인 조건·요소·조정값을 갖습니다.
export interface CeilingSpace {
  id: string;

  // 이 구조에서 siteInput.name은 거실·주방 등의 공간명입니다.
  siteInput: SiteInput;
  materialInput: MaterialInput;

  features: CeilingFeature[];
  adjustments: Adjustment[];

  snapshot: CalculationSnapshot | null;
}

export interface HousingUnitType {
  id: string;

  // 예: 84A, 84B
  name: string;

  // 동일한 공간 구성과 입력값을 반복 적용할 세대 수
  unitCount: number;

  // 한 세대에 속한 공간
  spaces: CeilingSpace[];
}

export interface HousingProject {
  id: string;

  // 공간명과 분리된 프로젝트명
  name: string;

  unitTypes: HousingUnitType[];
  updatedAt: string;
}

export type HousingOrderPolicy = "PER_SPACE_PER_UNIT";

export interface RepeatedMaterialResult {
  // 한 공간·한 세대 기준 계산 결과
  material: MaterialCalculation;

  // 해당 타입 전체 세대에 필요한 발주 수량
  totalOrderQuantity: number;

  // 석고보드는 장수, 금속은 총길이
  totalOrderedQuantity: number;

  totalEstimatedCost: number | null;
}

export interface SpaceCalculation {
  spaceId: string;
  spaceName: string;

  // 한 공간·한 세대 기준
  result: CalculationResult;

  // 해당 타입 전체 세대 기준
  repeatedMaterials: RepeatedMaterialResult[];
}

export interface UnitTypeCalculation {
  unitTypeId: string;
  unitTypeName: string;
  unitCount: number;

  spaces: SpaceCalculation[];

  // 한 세대의 모든 공간 면적 합계
  areaPerUnitM2: number;

  // 해당 타입 전체 세대의 면적 합계
  totalAreaM2: number;

  costPerUnit: number | null;
  totalEstimatedCost: number | null;
}

export interface HousingCalculationResult {
  projectId: string;
  orderPolicy: HousingOrderPolicy;

  unitTypes: UnitTypeCalculation[];

  totalUnitCount: number;
  totalAreaM2: number;
  totalEstimatedCost: number | null;
}

export interface HousingReport {
  calculatedAt: string;
  calculationRuleVersion: string;

  // 전체 계산 당시 프로젝트 복사본
  project: HousingProject;

  result: HousingCalculationResult;
}
