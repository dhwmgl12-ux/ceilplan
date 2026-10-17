import type {
  HousingCalculationResult,
  HousingOrderPolicy,
  HousingProject,
  SpaceCalculation,
  UnitTypeCalculation,
  HousingReport,
} from "../../types/housing-project";

import { calculateBase } from "./base.ts";

function checkFiniteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label}이 계산 가능한 범위를 벗어났습니다.`);
  }

  return value;
}

function checkCount(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label}이 처리 가능한 정수 범위를 벗어났습니다.`);
  }

  return value;
}

function sumCosts(values: (number | null)[]): number | null {
  if (values.some((value) => value === null)) {
    return null;
  }

  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);

  return checkFiniteNonNegative(total, "합계 금액");
}

function checkIds(items: { id: string }[], label: string): void {
  const ids = new Set<string>();

  for (const item of items) {
    if (!item.id.trim()) {
      throw new Error(`${label} ID가 비어 있습니다.`);
    }

    if (ids.has(item.id)) {
      throw new Error(`${label} ID가 중복되어 있습니다.`);
    }

    ids.add(item.id);
  }
}

export function calculateHousingProject(
  project: HousingProject,
  orderPolicy: HousingOrderPolicy,
): HousingCalculationResult {
  if (!project.id.trim() || !project.name.trim()) {
    throw new Error("프로젝트 ID와 이름을 입력하세요.");
  }

  if (orderPolicy !== "PER_SPACE_PER_UNIT") {
    throw new Error("지원하지 않는 발주 합산 정책입니다.");
  }

  if (project.unitTypes.length === 0) {
    throw new Error("세대 타입을 하나 이상 추가하세요.");
  }

  checkIds(project.unitTypes, "세대 타입");

  const unitTypes: UnitTypeCalculation[] = project.unitTypes.map((unitType) => {
    if (!unitType.name.trim()) {
      throw new Error("세대 타입 이름을 입력하세요.");
    }

    if (!Number.isSafeInteger(unitType.unitCount) || unitType.unitCount <= 0) {
      throw new Error(
        `${unitType.name}: 세대 수는 1 이상의 안전한 정수여야 합니다.`,
      );
    }

    if (unitType.spaces.length === 0) {
      throw new Error(`${unitType.name}: 공간을 하나 이상 추가하세요.`);
    }

    checkIds(unitType.spaces, `${unitType.name} 공간`);

    const spaces: SpaceCalculation[] = unitType.spaces.map((space) => {
      let result;

      try {
        result = calculateBase(space.siteInput, space.materialInput, {
          features: space.features,
          adjustments: space.adjustments,
        });
      } catch (error) {
        throw new Error(
          `${unitType.name} / ${space.siteInput.name || "이름 없는 공간"}: ${
            error instanceof Error ? error.message : "계산에 실패했습니다."
          }`,
        );
      }

      const repeatedMaterials = result.materials.map((material) => ({
        material,

        totalOrderQuantity: checkCount(
          material.orderQuantity * unitType.unitCount,
          `${material.name} 전체 발주 수량`,
        ),

        totalOrderedQuantity: checkFiniteNonNegative(
          material.orderedQuantity * unitType.unitCount,
          `${material.name} 전체 주문 물량`,
        ),

        totalEstimatedCost:
          material.estimatedCost === null
            ? null
            : checkFiniteNonNegative(
                material.estimatedCost * unitType.unitCount,
                `${material.name} 전체 금액`,
              ),
      }));

      return {
        spaceId: space.id,
        spaceName: space.siteInput.name,
        result,
        repeatedMaterials,
      };
    });

    const areaPerUnitM2 = checkFiniteNonNegative(
      spaces.reduce((sum, space) => sum + space.result.areaM2, 0),
      `${unitType.name} 한 세대 면적`,
    );

    const costPerUnit = sumCosts(
      spaces.map((space) => space.result.totalEstimatedCost),
    );

    return {
      unitTypeId: unitType.id,
      unitTypeName: unitType.name,
      unitCount: unitType.unitCount,
      spaces,
      areaPerUnitM2,

      totalAreaM2: checkFiniteNonNegative(
        areaPerUnitM2 * unitType.unitCount,
        `${unitType.name} 전체 면적`,
      ),

      costPerUnit,

      totalEstimatedCost:
        costPerUnit === null
          ? null
          : checkFiniteNonNegative(
              costPerUnit * unitType.unitCount,
              `${unitType.name} 전체 금액`,
            ),
    };
  });

  return {
    projectId: project.id,
    orderPolicy,
    unitTypes,

    totalUnitCount: checkCount(
      unitTypes.reduce((sum, type) => sum + type.unitCount, 0),
      "전체 세대 수",
    ),

    totalAreaM2: checkFiniteNonNegative(
      unitTypes.reduce((sum, type) => sum + type.totalAreaM2, 0),
      "전체 공간 면적",
    ),

    totalEstimatedCost: sumCosts(
      unitTypes.map((type) => type.totalEstimatedCost),
    ),
  };
}

export function createHousingReport(
  project: HousingProject,
  calculatedAt = new Date().toISOString(),
): HousingReport {
  if (!Number.isFinite(Date.parse(calculatedAt))) {
    throw new Error("계산 시각이 올바르지 않습니다.");
  }

  const input = structuredClone(project);

  return {
    calculatedAt,
    calculationRuleVersion: "housing-per-space-per-unit-v1",
    project: input,
    result: calculateHousingProject(input, "PER_SPACE_PER_UNIT"),
  };
}
