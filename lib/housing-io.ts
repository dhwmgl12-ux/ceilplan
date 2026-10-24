import type {
  CeilingSpace,
  HousingProject,
  HousingUnitType,
} from "../types/housing-project";

import { importProjectJson, normalizeProjectData } from "./project-io.ts";

export const MAX_HOUSING_JSON_BYTES = 10 * 1024 * 1024;

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }

  return value as Record<string, unknown>;
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}이 비어 있습니다.`);
  }

  return value;
}

function validDate(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("프로젝트 저장 시각이 올바르지 않습니다.");
  }

  return value;
}

function checkUniqueIds(values: { id: string }[], label: string) {
  if (new Set(values.map((value) => value.id)).size !== values.length) {
    throw new Error(`${label} ID가 중복되어 있습니다.`);
  }
}

function checkJsonSize(raw: string) {
  if (new TextEncoder().encode(raw).byteLength > MAX_HOUSING_JSON_BYTES) {
    throw new Error("프로젝트 JSON은 10MB 이하여야 합니다.");
  }
}

export function normalizeHousingProject(value: unknown): HousingProject {
  const source = record(value, "프로젝트");

  const id = nonEmpty(source.id, "프로젝트 ID");
  const name = nonEmpty(source.name, "프로젝트명");
  const updatedAt = validDate(source.updatedAt);

  if (!Array.isArray(source.unitTypes)) {
    throw new Error("세대 타입 목록이 올바르지 않습니다.");
  }

  const unitTypes: HousingUnitType[] = source.unitTypes.map((rawType) => {
    const type = record(rawType, "세대 타입");

    const typeId = nonEmpty(type.id, "타입 ID");
    const typeName = nonEmpty(type.name, "타입 이름");

    if (
      typeof type.unitCount !== "number" ||
      !Number.isSafeInteger(type.unitCount) ||
      type.unitCount <= 0
    ) {
      throw new Error("세대 수는 1 이상의 안전한 정수여야 합니다.");
    }

    if (!Array.isArray(type.spaces)) {
      throw new Error("공간 목록이 올바르지 않습니다.");
    }

    const spaces: CeilingSpace[] = type.spaces.map((rawSpace) => {
      const space = record(rawSpace, "공간");

      if (
        !Array.isArray(space.features) ||
        !Array.isArray(space.adjustments) ||
        !("snapshot" in space)
      ) {
        throw new Error("공간 요소·조정값·Snapshot 필드를 확인하세요.");
      }

      // 기존 단일 공간 검증을 재사용합니다.
      const normalized = normalizeProjectData({
        ...space,
        updatedAt,
      });

      return {
        id: normalized.id,
        siteInput: normalized.siteInput,
        materialInput: normalized.materialInput,
        features: normalized.features,
        adjustments: normalized.adjustments,
        snapshot: normalized.snapshot,
      };
    });

    checkUniqueIds(spaces, `${typeName} 공간`);

    return {
      id: typeId,
      name: typeName,
      unitCount: type.unitCount,
      spaces,
    };
  });

  checkUniqueIds(unitTypes, "세대 타입");

  // 공간이 없는 작성 중 프로젝트도 저장할 수 있습니다.
  // 실제 계산 가능 여부는 계산 함수에서 검사합니다.
  return structuredClone({
    id,
    name,
    updatedAt,
    unitTypes,
  });
}

export function convertSingleProject(value: unknown): HousingProject {
  const previous = normalizeProjectData(value);

  return {
    id: previous.id,
    name: previous.siteInput.name.trim() || "변환한 프로젝트",
    updatedAt: previous.updatedAt,

    unitTypes: [
      {
        id: "converted-unit-type",
        name: "기본 타입",
        unitCount: 1,

        spaces: [
          {
            id: "converted-space",
            siteInput: structuredClone(previous.siteInput),
            materialInput: structuredClone(previous.materialInput),
            features: structuredClone(previous.features),
            adjustments: structuredClone(previous.adjustments),
            snapshot: previous.snapshot
              ? structuredClone(previous.snapshot)
              : null,
          },
        ],
      },
    ],
  };
}

export function exportHousingJson(
  project: HousingProject,
  exportedAt = new Date().toISOString(),
): string {
  validDate(exportedAt);

  const raw = JSON.stringify(
    {
      kind: "CEILPLAN_HOUSING_PROJECT",
      schemaVersion: 3,
      exportedAt,
      project: normalizeHousingProject(project),
    },
    null,
    2,
  );

  checkJsonSize(raw);

  return raw;
}

export function importHousingJson(raw: string): HousingProject {
  checkJsonSize(raw);

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("올바른 JSON 파일이 아닙니다.");
  }

  const data = record(parsed, "백업 파일");

  if (data.schemaVersion === 2) {
    // 기존 단일 공간 백업도 다중 공간으로 변환합니다.
    return convertSingleProject(importProjectJson(raw));
  }

  if (data.kind !== "CEILPLAN_HOUSING_PROJECT" || data.schemaVersion !== 3) {
    throw new Error("지원하지 않는 다중 공간 백업 형식입니다.");
  }

  validDate(data.exportedAt);

  return normalizeHousingProject(data.project);
}
