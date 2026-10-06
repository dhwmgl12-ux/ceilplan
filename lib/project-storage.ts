import {
  featureLabels,
  type CeilingFeature,
  type MaterialInput,
  type Project,
  type SiteInput,
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
    isFeatureList(value.features)
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

export function readProjects(): Project[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("저장된 프로젝트 데이터를 읽을 수 없습니다.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isProject)) {
    throw new Error("저장된 프로젝트 형식이 올바르지 않습니다.");
  }

  const ids = new Set(parsed.map((project) => project.id));

  if (ids.size !== parsed.length) {
    throw new Error("저장된 프로젝트 ID가 중복되어 있습니다.");
  }

  return [...parsed].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function saveProject(project: Project): Project[] {
  if (!isProject(project)) {
    throw new Error("저장할 프로젝트 형식이 올바르지 않습니다.");
  }

  // 기존 데이터가 손상되었다면 읽기 단계에서 중단합니다.
  // 빈 목록으로 대체해 기존 데이터를 덮어쓰지 않습니다.
  const projects = readProjects();

  const nextProjects = [
    project,
    ...projects.filter((item) => item.id !== project.id),
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProjects));

  return nextProjects;
}
