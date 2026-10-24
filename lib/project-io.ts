import type {
  CalculationSnapshot,
  Project,
  ProjectExportV2,
  StoredProjectV2,
} from "../types/ceilplan";

const siteKeys = ["name", "widthMm", "lengthMm"];

const materialKeys = [
  "mbarSpacingMm",
  "carryingSpacingMm",
  "boardWidthMm",
  "boardLengthMm",
  "layerCount",
  "boardLossPercent",
  "metalLossPercent",
  "mbarStockLengthMm",
  "carryingStockLengthMm",
  "boardUnitPrice",
  "mbarUnitPrice",
  "carryingUnitPrice",
];

const featureTypes = [
  "AIR_CONDITIONER",
  "INSPECTION_HATCH",
  "SPRINKLER",
  "LIGHT_BOX",
];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function nonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function positive(value: unknown): value is number {
  return nonNegative(value) && value > 0;
}

function date(value: unknown): value is string {
  return text(value) && Number.isFinite(Date.parse(value));
}

function stringFields(value: unknown, keys: string[]): boolean {
  return record(value) && keys.every((key) => typeof value[key] === "string");
}

function isFeature(value: unknown): boolean {
  return (
    record(value) &&
    text(value.id) &&
    typeof value.type === "string" &&
    featureTypes.includes(value.type) &&
    nonNegative(value.xMm) &&
    nonNegative(value.yMm) &&
    positive(value.widthMm) &&
    positive(value.lengthMm)
  );
}

function isAdjustment(value: unknown): boolean {
  if (!record(value)) return false;

  const validUnit =
    (value.materialId === "BOARD" && value.unit === "㎡") ||
    ((value.materialId === "MBAR" || value.materialId === "CARRYING") &&
      value.unit === "m");

  return (
    text(value.id) &&
    text(value.featureId) &&
    (value.adjustmentType === "ADD" || value.adjustmentType === "DEDUCT") &&
    positive(value.quantity) &&
    text(value.memo) &&
    value.sourceType === "USER_INPUT" &&
    value.status === "INPUT_BASED" &&
    validUnit
  );
}

function uniqueIds(values: Record<string, unknown>[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}

function validInputs(value: unknown): boolean {
  if (!record(value)) return false;

  if (
    !stringFields(value.siteInput, siteKeys) ||
    !isRoomShapeInput(value.siteInput) ||
    !stringFields(value.materialInput, materialKeys) ||
    !Array.isArray(value.features) ||
    !value.features.every(isFeature) ||
    !Array.isArray(value.adjustments) ||
    !value.adjustments.every(isAdjustment)
  ) {
    return false;
  }

  const features = value.features as Record<string, unknown>[];
  const adjustments = value.adjustments as Record<string, unknown>[];
  const featureIds = new Set(features.map((feature) => feature.id));

  return (
    uniqueIds(features) &&
    uniqueIds(adjustments) &&
    adjustments.every((adjustment) => featureIds.has(adjustment.featureId))
  );
}

export function isCalculationSnapshot(
  value: unknown,
): value is CalculationSnapshot {
  if (
    !record(value) ||
    !date(value.calculatedAt) ||
    !text(value.calculationRuleVersion) ||
    !validInputs(value) ||
    !record(value.result)
  ) {
    return false;
  }

  const result = value.result;

  if (
    !positive(result.areaM2) ||
    !Array.isArray(result.materials) ||
    result.materials.length !== 3 ||
    !(
      result.totalEstimatedCost === null ||
      nonNegative(result.totalEstimatedCost)
    )
  ) {
    return false;
  }

  const features = value.features as Record<string, unknown>[];
  const adjustments = value.adjustments as Record<string, unknown>[];

  const ids = new Set<unknown>();

  for (const material of result.materials) {
    if (!record(material)) return false;

    const isBoard = material.id === "BOARD";

    if (
      !["BOARD", "MBAR", "CARRYING"].includes(String(material.id)) ||
      ids.has(material.id) ||
      !text(material.name) ||
      material.quantityUnit !== (isBoard ? "장" : "m") ||
      material.purchaseUnit !== (isBoard ? "장" : "본")
    ) {
      return false;
    }

    ids.add(material.id);

    const numberFields = [
      "theoreticalQuantity",
      "quantityBeforeLoss",
      "lossRate",
      "lossAmount",
      "quantityAfterLoss",
      "orderQuantity",
      "orderedQuantity",
      "roundingSurplus",
    ];

    if (
      !numberFields.every((key) => nonNegative(material[key])) ||
      !Number.isSafeInteger(material.orderQuantity) ||
      !(material.unitPrice === null || nonNegative(material.unitPrice)) ||
      !(material.estimatedCost === null || nonNegative(material.estimatedCost))
    ) {
      return false;
    }

    const summary = material.featureAdjustment;
    const expectedAdjustments = adjustments.filter(
      (adjustment) => adjustment.materialId === material.id,
    );

    if (summary === null) {
      if (expectedAdjustments.length !== 0) return false;
      continue;
    }

    if (
      !record(summary) ||
      !nonNegative(summary.addedQuantity) ||
      !nonNegative(summary.deductedQuantity) ||
      typeof summary.netQuantity !== "number" ||
      !Number.isFinite(summary.netQuantity) ||
      summary.quantityUnit !== material.quantityUnit ||
      !Array.isArray(summary.items) ||
      summary.items.length !== expectedAdjustments.length
    ) {
      return false;
    }

    const appliedIds = new Set<unknown>();

    for (const item of summary.items) {
      if (
        !record(item) ||
        !isAdjustment(item.adjustment) ||
        !positive(item.convertedQuantity) ||
        item.quantityUnit !== material.quantityUnit
      ) {
        return false;
      }

      const applied = item.adjustment as Record<string, unknown>;
      const original = expectedAdjustments.find(
        (adjustment) => adjustment.id === applied.id,
      );
      const feature = features.find((entry) => entry.id === applied.featureId);

      if (
        !original ||
        !feature ||
        appliedIds.has(applied.id) ||
        item.featureType !== feature.type
      ) {
        return false;
      }

      for (const key of [
        "id",
        "featureId",
        "materialId",
        "adjustmentType",
        "quantity",
        "unit",
        "memo",
        "sourceType",
        "status",
      ]) {
        if (applied[key] !== original[key]) return false;
      }

      appliedIds.add(applied.id);
    }
  }

  return true;
}

export function normalizeProjectData(value: unknown): StoredProjectV2 {
  if (!record(value)) {
    throw new Error("프로젝트가 객체 형식이 아닙니다.");
  }

  // 이전 프로젝트의 누락된 필드만 보완합니다.
  const candidate: Record<string, unknown> = {
    ...value,
    features: value.features === undefined ? [] : value.features,
    adjustments: value.adjustments === undefined ? [] : value.adjustments,
    snapshot: value.snapshot === undefined ? null : value.snapshot,
  };

  if (
    !text(candidate.id) ||
    !date(candidate.updatedAt) ||
    !validInputs(candidate) ||
    !(candidate.snapshot === null || isCalculationSnapshot(candidate.snapshot))
  ) {
    throw new Error("프로젝트 입력 또는 Snapshot 형식이 올바르지 않습니다.");
  }

  // 형식 검증을 마친 데이터만 타입으로 취급합니다.
  const project = candidate as unknown as StoredProjectV2;

  return structuredClone({
    id: project.id,
    updatedAt: project.updatedAt,
    siteInput: project.siteInput,
    materialInput: project.materialInput,
    features: project.features,
    adjustments: project.adjustments,
    snapshot: project.snapshot,
  });
}

export function exportProjectJson(
  project: Project,
  exportedAt = new Date().toISOString(),
): string {
  if (!date(exportedAt)) {
    throw new Error("내보내기 시각이 올바르지 않습니다.");
  }

  const data: ProjectExportV2 = {
    schemaVersion: 2,
    exportedAt,
    project: normalizeProjectData(project),
  };

  return JSON.stringify(data, null, 2);
}

export function importProjectJson(raw: string): StoredProjectV2 {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("올바른 JSON 파일이 아닙니다.");
  }

  if (!record(value) || value.schemaVersion !== 2 || !date(value.exportedAt)) {
    throw new Error("지원하지 않는 프로젝트 백업 형식입니다.");
  }

  return normalizeProjectData(value.project);
}

export function isRoomShapeInput(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const site = value as Record<string, unknown>;

  if (
    site.shape !== undefined &&
    site.shape !== "RECTANGLE" &&
    site.shape !== "L" &&
    site.shape !== "U"
  ) {
    return false;
  }

  const keys = ["cutoutWidthMm", "cutoutLengthMm", "cutoutTopMm"];

  return keys.every(
    (key) => site[key] === undefined || typeof site[key] === "string",
  );
}
