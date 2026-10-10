import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
} from "react";

import type {
  Adjustment,
  MaterialInput,
  Project,
  SiteInput,
  CeilingFeature,
  CalculationSnapshot,
} from "@/types/ceilplan";
import { readProjects, saveProject } from "@/lib/project-storage";

import { exportProjectJson, importProjectJson } from "@/lib/project-io";
import { downloadText } from "@/lib/download";

export interface ProjectManagerHandle {
  openList: () => void;
}

interface ProjectManagerProps {
  adjustments: Adjustment[];
  siteInput: SiteInput;
  materialInput: MaterialInput;
  dirty: boolean;
  onLoad: (project: Project, source: "storage" | "import") => void;
  onNew: () => void;
  onSaved: () => void;
  features: CeilingFeature[];
  ref?: Ref<ProjectManagerHandle>;
  snapshot: CalculationSnapshot | null;
}

export default function ProjectManager({
  ref,
  siteInput,
  materialInput,
  features,
  adjustments,
  snapshot,
  dirty,
  onLoad,
  onNew,
  onSaved,
}: ProjectManagerProps) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [listOpen, setListOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const importContext = JSON.stringify({
    projectId,
    siteInput,
    materialInput,
    features,
    adjustments,
    snapshot,
    dirty,
  });

  const latestImportContextRef = useRef(importContext);

  useEffect(() => {
    latestImportContextRef.current = importContext;
  }, [importContext]);

  function handleSave() {
    setMessage("");
    setError("");

    if (!siteInput.name.trim()) {
      setError("저장하려면 현장명을 입력해 주세요.");
      return;
    }

    try {
      const project: Project = {
        id: projectId ?? crypto.randomUUID(),
        siteInput: { ...siteInput },
        materialInput: { ...materialInput },
        features: features.map((feature) => ({ ...feature })),
        adjustments: adjustments.map((adjustment) => ({
          ...adjustment,
        })),
        snapshot: snapshot ? structuredClone(snapshot) : null,
        updatedAt: new Date().toISOString(),
      };

      const nextProjects = saveProject(project);

      setProjects(nextProjects);
      setProjectId(project.id);
      setSavedAt(project.updatedAt);
      onSaved();

      setMessage("이 브라우저에 프로젝트를 저장했습니다.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `저장 실패: ${caught.message}`
          : "프로젝트를 저장하지 못했습니다.",
      );
    }
  }

  function handleOpenList() {
    setMessage("");
    setError("");

    try {
      setProjects(readProjects());
      setListOpen(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `목록 조회 실패: ${caught.message}`
          : "프로젝트 목록을 읽지 못했습니다.",
      );
    }
  }

  useImperativeHandle(ref, () => ({
    openList: handleOpenList,
  }));

  function canReplaceInputs() {
    return (
      !dirty ||
      window.confirm("저장하지 않은 변경사항이 있습니다. 현재 입력을 바꿀까요?")
    );
  }

  function handleLoad(project: Project) {
    if (!canReplaceInputs()) return;

    onLoad(project, "storage");

    setProjectId(project.id);
    setSavedAt(project.updatedAt);
    setListOpen(false);
    setError("");
    setMessage(
      "프로젝트를 불러왔습니다. 저장된 계산 결과가 있더라도 다시 계산해 확인하세요.",
    );
  }

  function handleNew() {
    if (!canReplaceInputs()) return;

    onNew();

    setProjectId(null);
    setSavedAt(null);
    setListOpen(false);
    setError("");
    setMessage("새 프로젝트를 시작합니다.");
  }

  function handleExportJson() {
    setMessage("");
    setError("");

    try {
      const project: Project = {
        id: projectId ?? crypto.randomUUID(),
        siteInput: { ...siteInput },
        materialInput: { ...materialInput },
        features,
        adjustments,
        snapshot,
        updatedAt: new Date().toISOString(),
      };

      const content = exportProjectJson(project);

      downloadText(
        `ceilplan-project-${Date.now()}.json`,
        content,
        "application/json;charset=utf-8",
      );

      setMessage("현재 입력과 마지막 계산 결과를 JSON으로 내보냈습니다.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "프로젝트를 내보내지 못했습니다.",
      );
    }
  }

  async function handleImportJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // 같은 파일을 다시 선택할 수 있도록 초기화합니다.
    event.target.value = "";

    if (!file) return;

    const contextAtStart = importContext;

    setMessage("");
    setError("");
    setImporting(true);

    try {
      // 파일 크기 제한이며 시공 기준과 관계없습니다.
      if (file.size > 1024 * 1024) {
        throw new Error("JSON 파일은 1MB 이하로 선택하세요.");
      }

      const imported = importProjectJson(await file.text());

      if (latestImportContextRef.current !== contextAtStart) {
        throw new Error(
          "파일을 읽는 동안 프로젝트가 변경되었습니다. JSON 파일을 다시 선택하세요.",
        );
      }

      // 파일 읽기와 검증 후 현재 입력 교체 여부를 확인합니다.
      if (!canReplaceInputs()) return;

      // 기존 프로젝트를 덮어쓰지 않도록 새 프로젝트로 불러옵니다.
      const project: Project = {
        ...imported,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };

      onLoad(project, "import");

      setProjectId(project.id);
      setSavedAt(null);
      setListOpen(false);

      setMessage(
        "JSON을 새 프로젝트로 불러왔습니다. 브라우저에 저장하려면 저장 버튼을 누르세요. 가져온 계산 결과는 재계산이 필요합니다.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "프로젝트를 가져오지 못했습니다.",
      );
    } finally {
      setImporting(false);
    }
  }
  return (
    <section
      id="projects"
      aria-labelledby="project-manager-title"
      className="mt-4 border-t border-slate-100 pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="project-manager-title" className="sr-only">
            프로젝트 관리
          </h2>

          <p className="text-xs leading-5 text-slate-500">
            {savedAt
              ? `마지막 저장: ${new Date(savedAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}`
              : "아직 저장하지 않았습니다."}

            {dirty && (
              <span className="ml-2 font-medium text-amber-700">
                · 저장하지 않은 변경사항
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleNew}
            // 새 프로젝트 버튼
            className="cp-button-secondary"
          >
            새 프로젝트
          </button>

          <button
            type="button"
            onClick={handleOpenList}
            aria-expanded={listOpen}
            aria-controls="project-list"
            className="cp-button-secondary"
          >
            프로젝트 목록
          </button>

          <button
            type="button"
            onClick={handleSave}
            // 저장 버튼
            className="cp-button-primary"
          >
            저장
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="cp-button-secondary"
          >
            JSON 내보내기
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="cp-button-secondary disabled:opacity-50"
          >
            {importing ? "가져오는 중…" : "JSON 가져오기"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJson}
            className="hidden"
            aria-label="프로젝트 JSON 파일 선택"
          />
        </div>
      </div>

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

      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">브라우저 저장 안내</summary>

        <p className="mt-2 leading-5">
          이 브라우저에만 저장됩니다. 다른 기기와 동기화되지 않으며, 브라우저
          데이터를 삭제하면 저장 내용도 사라집니다.
        </p>
      </details>

      <div id="project-list" hidden={!listOpen}>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">저장한 프로젝트</h3>

            <button
              type="button"
              onClick={() => setListOpen(false)}
              className="rounded px-2 py-1 text-xs text-slate-500"
            >
              목록 닫기
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              저장한 프로젝트가 없습니다.
            </p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {projects.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => handleLoad(project)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="block text-sm font-semibold">
                      {project.siteInput.name}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {project.siteInput.widthMm || "미입력"} ×{" "}
                      {project.siteInput.lengthMm || "미입력"} mm
                    </span>

                    <span className="mt-1 block text-xs text-slate-400">
                      {new Date(project.updatedAt).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
