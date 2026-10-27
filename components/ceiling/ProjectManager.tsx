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

import { createExampleProject } from "@/lib/example-project";

export interface ProjectManagerHandle {
  openList: () => void;
  loadExample: () => void;
}

interface ProjectManagerProps {
  adjustments: Adjustment[];
  siteInput: SiteInput;
  materialInput: MaterialInput;
  dirty: boolean;
  onLoad: (project: Project, source: "storage" | "import" | "example") => void;
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
  const [projectSearch, setProjectSearch] = useState("");

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
      setProjectSearch("");
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
    loadExample: handleLoadExample,
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

  function handleLoadExample() {
    if (!canReplaceInputs()) return;

    const project = createExampleProject(
      crypto.randomUUID(),
      new Date().toISOString(),
    );

    onLoad(project, "example");

    setProjectId(project.id);
    setSavedAt(null);
    setListOpen(false);
    setError("");
    setMessage(
      "체험용 예시를 불러왔습니다. 모든 수치는 검산용이며 시공 권장값이나 실제 단가가 아닙니다. 계산 버튼을 눌러 결과를 확인하세요.",
    );
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

  const searchKeyword = projectSearch.trim().toLocaleLowerCase("ko-KR");

  const filteredProjects = projects.filter((project) =>
    project.siteInput.name.toLocaleLowerCase("ko-KR").includes(searchKeyword),
  );

  return (
    <section
      id="projects"
      aria-labelledby="project-manager-title"
      className="border-t border-[var(--cp-border)] px-4 py-3 sm:px-6"
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNew}
            disabled={importing}
            className="cp-button-secondary"
          >
            새 프로젝트
          </button>

          <button
            type="button"
            onClick={handleOpenList}
            disabled={importing}
            aria-expanded={listOpen}
            aria-controls="project-list"
            className="cp-button-secondary"
          >
            목록 열기
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={importing}
            className="cp-button-primary"
          >
            프로젝트 저장
          </button>

          <details className="rounded-md border border-slate-200 bg-white">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              추가 작업
              <span aria-hidden="true">⌄</span>
            </summary>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={handleLoadExample}
                disabled={importing}
                className="cp-button-secondary"
              >
                예시 프로젝트 불러오기
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                disabled={importing}
                className="cp-button-secondary"
              >
                JSON 내보내기
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="cp-button-secondary"
              >
                {importing ? "가져오는 중…" : "JSON 가져오기"}
              </button>
            </div>
          </details>

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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                저장한 프로젝트
              </h3>

              <p className="mt-1 text-[11px] text-slate-500">
                현재 브라우저 · {projects.length}개
              </p>
            </div>

            <button
              type="button"
              onClick={() => setListOpen(false)}
              className="cp-button-secondary"
            >
              닫기
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                저장한 프로젝트가 없습니다
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                현재 작업을 저장하거나 예시 프로젝트로 시작하세요. 기존 JSON
                파일은 추가 작업에서 가져올 수 있습니다.
              </p>

              <button
                type="button"
                onClick={handleLoadExample}
                disabled={importing}
                className="cp-button-secondary mt-3"
              >
                예시로 시작하기
              </button>
            </div>
          ) : (
            <>
              <label className="mt-3 block">
                <span className="sr-only">프로젝트 이름 검색</span>

                <input
                  type="search"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="프로젝트 이름 검색"
                  className="cp-input"
                />
              </label>

              {filteredProjects.length === 0 ? (
                <p role="status" className="mt-3 text-xs text-slate-500">
                  검색 결과가 없습니다. 다른 이름으로 검색하세요.
                </p>
              ) : (
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {filteredProjects.map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        onClick={() => handleLoad(project)}
                        disabled={importing}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${
                          project.id === projectId
                            ? "border-blue-200 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="break-words text-sm font-semibold text-slate-800">
                            {project.siteInput.name || "이름 없는 프로젝트"}
                          </span>

                          {project.id === projectId && (
                            <span className="text-[11px] font-medium text-blue-700">
                              현재 프로젝트
                            </span>
                          )}
                        </span>

                        <span className="mt-2 block text-xs text-slate-500">
                          {project.siteInput.shape === "L"
                            ? "ㄱ자"
                            : project.siteInput.shape === "U"
                              ? "ㄷ자"
                              : "직사각형"}
                          {" · "}
                          {project.siteInput.widthMm || "미입력"} ×{" "}
                          {project.siteInput.lengthMm || "미입력"} mm
                        </span>

                        <span className="mt-1 block text-[11px] text-slate-500">
                          수정일{" "}
                          {new Date(project.updatedAt).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
