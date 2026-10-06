import { useState } from "react";
import type { MaterialInput, Project, SiteInput } from "@/types/ceilplan";
import { readProjects, saveProject } from "@/lib/project-storage";

interface ProjectManagerProps {
  siteInput: SiteInput;
  materialInput: MaterialInput;
  dirty: boolean;
  onLoad: (project: Project) => void;
  onNew: () => void;
  onSaved: () => void;
}

export default function ProjectManager({
  siteInput,
  materialInput,
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

  function canReplaceInputs() {
    return (
      !dirty ||
      window.confirm("저장하지 않은 변경사항이 있습니다. 현재 입력을 바꿀까요?")
    );
  }

  function handleLoad(project: Project) {
    if (!canReplaceInputs()) return;

    onLoad(project);

    setProjectId(project.id);
    setSavedAt(project.updatedAt);
    setListOpen(false);
    setError("");
    setMessage("프로젝트를 불러왔습니다. 계산 버튼을 눌러 결과를 확인하세요.");
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

  return (
    <section
      aria-labelledby="project-manager-title"
      className="mb-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="project-manager-title" className="text-sm font-semibold">
            프로젝트 관리
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {savedAt
              ? `마지막 저장: ${new Date(savedAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}`
              : "아직 저장하지 않았습니다."}
            {dirty && " · 저장하지 않은 변경사항"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleNew}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            새 프로젝트
          </button>

          <button
            type="button"
            onClick={handleOpenList}
            aria-expanded={listOpen}
            aria-controls="project-list"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            프로젝트 목록
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            저장
          </button>
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

      <p className="mt-3 text-xs leading-5 text-slate-500">
        이 브라우저에만 저장됩니다. 다른 기기와 동기화되지 않으며, 브라우저
        데이터를 삭제하면 저장 내용도 사라집니다.
      </p>

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
