import {
  PROJECT_SCHEMA_VERSION,
  featureLabels,
  type Adjustment,
  type CeilingFeature,
  type MaterialInput,
  type Project,
  type ProjectStorageV2,
  type SiteInput,
  type StoredProjectV2,
} from "@/types/ceilplan";

const STORAGE_KEY = "ceilplan.projects.v1";

const siteKeys = [
  "name",
  "widthMm",
  "lengthMm",
] as const satisfies readonly (keyof SiteInput)[];

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
] as const satisfies readonly (keyof MaterialInput)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringFields(value: unknown, keys: readonly string[]): boolean {
  return isRecord(value) && keys.every((key) => typeof value[key] === "string");
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    value.id.trim() !== "" &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    hasStringFields(value.siteInput, siteKeys) &&
    hasStringFields(value.materialInput, materialKeys) &&
    isFeatureList(value.features) &&
    isAdjustmentList(value.adjustments, value.features) &&
    // Snapshot 검증·저장은 다음 단계에서 추가합니다.
    (value.snapshot === undefined || value.snapshot === null)
  );
}

function isFeature(value: unknown): value is CeilingFeature {
  if (!isRecord(value)) return false;

  if (
    typeof value.id !== "string" ||
    value.id.trim() === "" ||
    typeof value.type !== "string" ||
    !Object.prototype.hasOwnProperty.call(featureLabels, value.type)
  ) {
    return false;
  }

  const keys = ["xMm", "yMm", "widthMm", "lengthMm"] as const;

  for (const key of keys) {
    const number = value[key];

    if (typeof number !== "number" || !Number.isFinite(number)) {
      return false;
    }

    if (key === "xMm" || key === "yMm") {
      if (number < 0) return false;
    } else if (number <= 0) {
      return false;
    }
  }

  return true;
}

function isFeatureList(value: unknown): boolean {
  // 이전에 저장한 프로젝트는 요소 필드가 없어도 읽습니다.
  if (value === undefined) return true;

  if (!Array.isArray(value) || !value.every(isFeature)) {
    return false;
  }

  const ids = new Set(value.map((feature) => feature.id));

  return ids.size === value.length;
}

function isAdjustment(value: unknown): value is Adjustment {
  if (!isRecord(value)) return false;

  const validMaterialUnit =
    (value.materialId === "BOARD" && value.unit === "㎡") ||
    ((value.materialId === "MBAR" || value.materialId === "CARRYING") &&
      value.unit === "m");

  return (
    typeof value.id === "string" &&
    value.id.trim() !== "" &&
    typeof value.featureId === "string" &&
    value.featureId.trim() !== "" &&
    (value.adjustmentType === "ADD" || value.adjustmentType === "DEDUCT") &&
    typeof value.quantity === "number" &&
    Number.isFinite(value.quantity) &&
    value.quantity > 0 &&
    typeof value.memo === "string" &&
    value.memo.trim() !== "" &&
    value.sourceType === "USER_INPUT" &&
    value.status === "INPUT_BASED" &&
    validMaterialUnit
  );
}

function isAdjustmentList(value: unknown, features: unknown): boolean {
  // 이전 프로젝트에는 조정값 필드가 없습니다.
  if (value === undefined) return true;

  if (!Array.isArray(value) || !value.every(isAdjustment)) {
    return false;
  }

  const adjustmentIds = new Set(value.map((adjustment) => adjustment.id));

  if (adjustmentIds.size !== value.length) {
    return false;
  }

  const featureList = features === undefined ? [] : features;

  if (!Array.isArray(featureList) || !featureList.every(isFeature)) {
    return false;
  }

  const featureIds = new Set(featureList.map((feature) => feature.id));

  // 존재하지 않는 요소에 연결된 조정값은 저장하지 않습니다.
  return value.every((adjustment) => featureIds.has(adjustment.featureId));
}

function normalizeProject(project: Project): StoredProjectV2 {
  return {
    id: project.id,
    siteInput: { ...project.siteInput },
    materialInput: { ...project.materialInput },
    updatedAt: project.updatedAt,
    features: (project.features ?? []).map((feature) => ({
      ...feature,
    })),
    adjustments: (project.adjustments ?? []).map((adjustment) => ({
      ...adjustment,
    })),

    // Snapshot 저장은 다음 단계에서 구현합니다.
    snapshot: null,
  };
}

function isStoredProjectV2(value: unknown): value is StoredProjectV2 {
  return (
    isProject(value) &&
    Array.isArray(value.features) &&
    Array.isArray(value.adjustments) &&
    value.snapshot === null
  );
}

export function readProjects(): StoredProjectV2[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("저장된 프로젝트 데이터를 읽을 수 없습니다.");
  }

  let projects: Project[];

  if (Array.isArray(parsed)) {
    // 기존 형식: Project[]
    if (!parsed.every(isProject)) {
      throw new Error("기존 프로젝트 형식이 올바르지 않습니다.");
    }

    projects = parsed;
  } else {
    // 새 형식: { schemaVersion: 2, projects: [...] }
    if (!isRecord(parsed)) {
      throw new Error("저장된 프로젝트 형식이 올바르지 않습니다.");
    }

    if (parsed.schemaVersion !== PROJECT_SCHEMA_VERSION) {
      throw new Error("지원하지 않는 프로젝트 저장 버전입니다.");
    }

    if (
      !Array.isArray(parsed.projects) ||
      !parsed.projects.every(isStoredProjectV2)
    ) {
      throw new Error("저장된 프로젝트 목록 형식이 올바르지 않습니다.");
    }

    projects = parsed.projects;
  }

  const ids = new Set(projects.map((project) => project.id));

  if (ids.size !== projects.length) {
    throw new Error("저장된 프로젝트 ID가 중복되어 있습니다.");
  }

  // 읽을 때만 변환합니다. 이 함수는 저장 데이터를 변경하지 않습니다.
  return projects
    .map(normalizeProject)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function saveProject(project: Project): StoredProjectV2[] {
  if (!isProject(project)) {
    throw new Error("저장할 프로젝트 형식이 올바르지 않습니다.");
  }

  // 기존 데이터가 손상됐다면 중단하여 덮어쓰기를 방지합니다.
  const projects = readProjects();
  const normalized = normalizeProject(project);

  const nextProjects = [
    normalized,
    ...projects.filter((item) => item.id !== normalized.id),
  ].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const storage: ProjectStorageV2 = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projects: nextProjects,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

  return nextProjects;
}
