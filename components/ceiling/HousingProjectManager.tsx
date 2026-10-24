"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import type { Project } from "@/types/ceilplan";
import type { HousingProject } from "@/types/housing-project";

import { readProjects } from "@/lib/project-storage";
import { readHousingProjects, saveHousingProject } from "@/lib/housing-storage";
import {
  convertSingleProject,
  exportHousingJson,
  importHousingJson,
  MAX_HOUSING_JSON_BYTES,
} from "@/lib/housing-io";
import { downloadText } from "@/lib/download";

interface HousingProjectManagerProps {
  getProject: () => HousingProject;
  dirty: boolean;

  onSaved: (project: HousingProject) => void;

  onLoad: (
    project: HousingProject,
    source: "storage" | "import" | "legacy",
  ) => void;
}

export default function HousingProjectManager({
  getProject,
  dirty,
  onSaved,
  onLoad,
}: HousingProjectManagerProps) {
  const [projects, setProjects] = useState<HousingProject[]>([]);
  const [legacyProjects, setLegacyProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const latestRef = useRef({ getProject, dirty });

  useEffect(() => {
    latestRef.current = { getProject, dirty };
  });

  function canReplace() {
    return (
      !latestRef.current.dirty ||
      window.confirm(
        "저장하지 않은 변경사항이 있습니다. 다른 프로젝트로 바꿀까요?",
      )
    );
  }

  function preparedProject() {
    const project = getProject();

    return {
      ...project,
      id: project.id === "housing-draft" ? crypto.randomUUID() : project.id,
      updatedAt: new Date().toISOString(),
    };
  }

  function showError(caught: unknown) {
    setMessage("");
    setError(
      caught instanceof Error
        ? caught.message
        : "프로젝트 처리에 실패했습니다.",
    );
  }

  function handleSave() {
    try {
      const project = preparedProject();
      const next = saveHousingProject(project);

      setProjects(next);
      setSavedAt(project.updatedAt);
      onSaved(project);

      setError("");
      setMessage("다중 공간 프로젝트를 이 브라우저에 저장했습니다.");
    } catch (caught) {
      showError(caught);
    }
  }

  function handleOpenList() {
    try {
      setProjects(readHousingProjects());
      setError("");
      setMessage("저장한 다중 공간 프로젝트 목록입니다.");
    } catch (caught) {
      showError(caught);
    }
  }

  function handleOpenLegacy() {
    try {
      setLegacyProjects(readProjects());
      setError("");
      setMessage("변환할 단일 공간 프로젝트를 선택하세요. 원본은 유지됩니다.");
    } catch (caught) {
      showError(caught);
    }
  }

  function handleLoad(project: HousingProject) {
    if (!canReplace()) return;

    onLoad(structuredClone(project), "storage");
    setSavedAt(project.updatedAt);
    setError("");
    setMessage("프로젝트를 복원했습니다. 전체 계산을 다시 실행하세요.");
  }

  function handleConvert(previous: Project) {
    if (!canReplace()) return;

    try {
      const project = {
        ...convertSingleProject(previous),
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };

      onLoad(project, "legacy");
      setSavedAt(null);
      setError("");
      setMessage(
        "기본 타입·공간 1개로 복사했습니다. 다중 공간 저장 버튼으로 저장하세요. 단일 공간 원본은 변경하지 않았습니다.",
      );
    } catch (caught) {
      showError(caught);
    }
  }

  function handleExport() {
    try {
      const project = preparedProject();

      downloadText(
        `ceilplan-housing-${Date.now()}.json`,
        exportHousingJson(project),
        "application/json;charset=utf-8",
      );

      setError("");
      setMessage("현재 적용된 공간 입력과 Snapshot을 내보냈습니다.");
    } catch (caught) {
      showError(caught);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const before = JSON.stringify(latestRef.current.getProject());

    setImporting(true);

    try {
      if (file.size > MAX_HOUSING_JSON_BYTES) {
        throw new Error("JSON 파일은 10MB 이하여야 합니다.");
      }

      const imported = importHousingJson(await file.text());

      const after = JSON.stringify(latestRef.current.getProject());

      if (before !== after) {
        throw new Error(
          "파일을 읽는 동안 프로젝트가 변경됐습니다. 다시 선택하세요.",
        );
      }

      if (!canReplace()) return;

      const project = {
        ...imported,

        // 파일 원본이나 기존 저장 프로젝트를 덮어쓰지 않습니다.
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };

      onLoad(project, "import");
      setSavedAt(null);
      setError("");
      setMessage(
        "JSON을 새 프로젝트로 가져왔습니다. 전체 계산 후 브라우저에 저장하세요.",
      );
    } catch (caught) {
      showError(caught);
    } finally {
      setImporting(false);
    }
  }

  return (
    <section aria-labelledby="housing-storage-title" className="cp-card">
      <h2 id="housing-storage-title" className="cp-title">
        다중 공간 프로젝트 저장·백업
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={importing}
          className="cp-button-primary"
        >
          다중 공간 저장
        </button>

        <button
          type="button"
          onClick={handleOpenList}
          className="cp-button-secondary"
        >
          저장 목록
        </button>

        <button
          type="button"
          onClick={handleOpenLegacy}
          className="cp-button-secondary"
        >
          기존 단일 공간 변환
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="cp-button-secondary"
        >
          JSON 내보내기
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="cp-button-secondary"
        >
          {importing ? "가져오는 중…" : "JSON 가져오기"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
          aria-label="다중 공간 프로젝트 JSON 선택"
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {savedAt
          ? `마지막 저장: ${new Date(savedAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}`
          : "아직 저장하지 않았습니다."}
        {dirty && " · 저장하지 않은 변경사항"}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        이 브라우저에만 저장됩니다. 필요한 프로젝트는 JSON으로 백업하세요. 수정
        적용 전 임시 입력은 저장 대상이 아닙니다.
      </p>

      {message && (
        <p role="status" className="mt-3 text-sm text-blue-700">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {projects.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">저장된 다중 공간 프로젝트</h3>

          <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => handleLoad(project)}
                  className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-blue-50"
                >
                  {project.name}
                  <span className="ml-2 text-xs text-slate-500">
                    {project.unitTypes.length}개 타입
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {legacyProjects.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">변환할 단일 공간 프로젝트</h3>

          <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto">
            {legacyProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => handleConvert(project)}
                  className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-blue-50"
                >
                  {project.siteInput.name} · 복사해서 변환
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
