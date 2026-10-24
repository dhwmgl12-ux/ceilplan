import type { HousingProject } from "../types/housing-project";
import { normalizeHousingProject } from "./housing-io.ts";

const STORAGE_KEY = "ceilplan.housing-projects.v3";

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "getItem" | "setItem">;

export function readHousingProjects(
  storage: ReadStorage = localStorage,
): HousingProject[] {
  const raw = storage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("다중 공간 저장 데이터를 읽을 수 없습니다.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("다중 공간 저장 형식이 올바르지 않습니다.");
  }

  const data = parsed as Record<string, unknown>;

  if (data.schemaVersion !== 3 || !Array.isArray(data.projects)) {
    throw new Error("지원하지 않는 다중 공간 저장 형식입니다.");
  }

  const projects = data.projects.map(normalizeHousingProject);

  if (new Set(projects.map((project) => project.id)).size !== projects.length) {
    throw new Error("저장된 프로젝트 ID가 중복되어 있습니다.");
  }

  return projects.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function saveHousingProject(
  project: HousingProject,
  storage: WriteStorage = localStorage,
): HousingProject[] {
  const normalized = normalizeHousingProject(project);

  // 기존 데이터가 손상됐으면 중단합니다.
  const previous = readHousingProjects(storage);

  const projects = [
    normalized,
    ...previous.filter((item) => item.id !== normalized.id),
  ].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 3,
      projects,
    }),
  );

  return projects;
}
