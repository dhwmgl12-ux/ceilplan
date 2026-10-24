import type { CeilingFeatureType } from "../types/ceilplan";

export interface FeatureTemplate {
  id: string;
  name: string;
  type: CeilingFeatureType;
  widthMm: number;
  lengthMm: number;
}

const STORAGE_KEY = "ceilplan.feature-templates.v1";

type TemplateStorage = Pick<Storage, "getItem" | "setItem">;

function isTemplate(value: unknown): value is FeatureTemplate {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    Boolean(item.id.trim()) &&
    typeof item.name === "string" &&
    Boolean(item.name.trim()) &&
    (item.type === "AIR_CONDITIONER" ||
      item.type === "INSPECTION_HATCH" ||
      item.type === "SPRINKLER" ||
      item.type === "LIGHT_BOX") &&
    typeof item.widthMm === "number" &&
    Number.isFinite(item.widthMm) &&
    item.widthMm > 0 &&
    typeof item.lengthMm === "number" &&
    Number.isFinite(item.lengthMm) &&
    item.lengthMm > 0
  );
}

export function readFeatureTemplates(
  storage: Pick<Storage, "getItem"> = localStorage,
): FeatureTemplate[] {
  const raw = storage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  const value: unknown = JSON.parse(raw);

  if (typeof value !== "object" || value === null) {
    throw new Error("템플릿 저장 형식을 확인하세요.");
  }

  const data = value as Record<string, unknown>;

  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.templates) ||
    !data.templates.every(isTemplate)
  ) {
    throw new Error("템플릿 저장 형식을 확인하세요.");
  }

  const templates = data.templates;

  if (new Set(templates.map((item) => item.id)).size !== templates.length) {
    throw new Error("중복된 템플릿 식별자가 있습니다.");
  }

  return structuredClone(templates);
}

function writeTemplates(
  templates: FeatureTemplate[],
  storage: TemplateStorage,
) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      templates,
    }),
  );
}

export function saveFeatureTemplate(
  template: FeatureTemplate,
  storage: TemplateStorage = localStorage,
): FeatureTemplate[] {
  if (!isTemplate(template)) {
    throw new Error("템플릿 이름과 요소 규격을 확인하세요.");
  }

  // 기존 데이터가 손상됐다면 덮어쓰지 않습니다.
  const templates = readFeatureTemplates(storage);

  const next = [
    structuredClone(template),
    ...templates.filter((item) => item.id !== template.id),
  ];

  writeTemplates(next, storage);

  return next;
}

export function deleteFeatureTemplate(
  id: string,
  storage: TemplateStorage = localStorage,
): FeatureTemplate[] {
  const templates = readFeatureTemplates(storage);
  const next = templates.filter((item) => item.id !== id);

  writeTemplates(next, storage);

  return next;
}
