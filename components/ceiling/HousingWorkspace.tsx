"use client";

import Link from "next/link";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CeilingSpace,
  HousingReport,
  HousingProject,
  HousingUnitType,
} from "@/types/housing-project";

import CeilingWorkspace, { type SpaceEditorHandle } from "./CeilingWorkspace";

import HousingProjectManager from "./HousingProjectManager";
import { createHousingReport } from "@/lib/calculations/housing";
import { housingReportToCsv } from "@/lib/housing-csv";
import { downloadText } from "@/lib/download";
import DraftRecovery from "./DraftRecovery";
import { HOUSING_DRAFT_KEY } from "@/lib/draft-storage";
import { normalizeHousingProject } from "@/lib/housing-io";
import ToolSection from "@/components/ui/ToolSection";
import PendingInputNotice from "@/components/ui/PendingInputNotice";

function createSpace(name: string): CeilingSpace {
  return {
    id: crypto.randomUUID(),

    siteInput: {
      name,
      widthMm: "",
      lengthMm: "",
    },

    materialInput: {
      mbarSpacingMm: "",
      carryingSpacingMm: "",
      boardWidthMm: "",
      boardLengthMm: "",
      layerCount: "",
      boardLossPercent: "",
      metalLossPercent: "",
      mbarStockLengthMm: "",
      carryingStockLengthMm: "",
      boardUnitPrice: "",
      mbarUnitPrice: "",
      carryingUnitPrice: "",
    },

    features: [],
    adjustments: [],
    snapshot: null,
  };
}

function money(value: number | null) {
  return value === null
    ? "단가 입력 필요"
    : `${value.toLocaleString("ko-KR")} 원`;
}
function normalizeHousingDraft(value: unknown): HousingProject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("다중 공간 임시저장 형식이 올바르지 않습니다.");
  }

  const data = value as Record<string, unknown>;

  if (typeof data.name !== "string" || typeof data.updatedAt !== "string") {
    throw new Error("프로젝트 이름 또는 시각 형식을 확인하세요.");
  }

  // 작성 중에는 프로젝트 이름과 저장 시각이 비어 있을 수 있습니다.
  const normalized = normalizeHousingProject({
    ...data,
    name: data.name.trim() ? data.name : "이름 없는 임시 프로젝트",
    updatedAt: data.updatedAt || "2000-01-01T00:00:00.000Z",
  });

  return {
    ...normalized,
    name: data.name,
    updatedAt: data.updatedAt,
  };
}

function UnitTypeEditor({
  unitType,
  onApply,
}: {
  unitType: HousingUnitType;
  onApply: (name: string, unitCount: number) => void;
}) {
  const [name, setName] = useState(unitType.name);
  const [count, setCount] = useState(String(unitType.unitCount));
  const [error, setError] = useState("");
  const hasPendingInput =
    name !== unitType.name || count !== String(unitType.unitCount);

  function apply() {
    const value = Number(count);

    if (
      !name.trim() ||
      !count.trim() ||
      !Number.isSafeInteger(value) ||
      value <= 0
    ) {
      setError("타입 이름과 1 이상의 정수 세대 수를 입력하세요.");
      return;
    }

    onApply(name.trim(), value);
    setError("");
  }

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-3">
      <PendingInputNotice visible={hasPendingInput} label="세대 타입 수정 폼" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          타입 이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="cp-input mt-2"
          />
        </label>

        <label className="block text-sm font-medium">
          적용 세대 수
          <input
            type="number"
            min="1"
            step="1"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            className="cp-input mt-2"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={apply}
        className="cp-button-secondary mt-3"
      >
        타입 수정 적용
      </button>
    </div>
  );
}

export default function HousingWorkspace() {
  const [project, setProject] = useState<HousingProject>({
    id: "housing-draft",
    name: "",
    unitTypes: [],
    updatedAt: "",
  });

  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  const [newTypeName, setNewTypeName] = useState("");
  const [newSpaceName, setNewSpaceName] = useState("");

  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const [report, setReport] = useState<HousingReport | null>(null);

  const [reportStale, setReportStale] = useState(false);
  const [editorEpoch, setEditorEpoch] = useState(0);

  const editorRef = useRef<SpaceEditorHandle>(null);

  const activeType = project.unitTypes.find((type) => type.id === activeTypeId);

  const activeSpace = activeType?.spaces.find(
    (space) => space.id === activeSpaceId,
  );

  const handleEditorChange = useCallback(() => {
    setDirty(true);
    setReportStale(true);
  }, []);

  useEffect(() => {
    if (!dirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  // 선택을 바꾸기 전에 현재 공간의 적용된 입력을 읽습니다.
  function readCurrentProject(): HousingProject {
    const editedSpace = editorRef.current?.readSpace();

    if (!editedSpace || !activeTypeId) {
      return project;
    }

    return {
      ...project,
      unitTypes: project.unitTypes.map((type) =>
        type.id === activeTypeId
          ? {
              ...type,
              spaces: type.spaces.map((space) =>
                space.id === editedSpace.id ? editedSpace : space,
              ),
            }
          : type,
      ),
    };
  }

  function applyProject(next: HousingProject) {
    setProject({
      ...next,
      updatedAt: new Date().toISOString(),
    });

    setDirty(true);
    setReportStale(true);
    setError("");
  }

  function selectType(id: string) {
    if (id === activeTypeId) return;

    const next = readCurrentProject();
    const type = next.unitTypes.find((item) => item.id === id);

    setProject(next);
    setActiveTypeId(type?.id ?? null);
    setActiveSpaceId(type?.spaces[0]?.id ?? null);
    setError("");
  }

  function selectSpace(id: string) {
    if (id === activeSpaceId) return;

    setProject(readCurrentProject());
    setActiveSpaceId(id);
    setError("");
  }

  function addType() {
    if (!newTypeName.trim()) {
      setError("추가할 타입 이름을 입력하세요.");
      return;
    }

    const next = readCurrentProject();

    const type: HousingUnitType = {
      id: crypto.randomUUID(),
      name: newTypeName.trim(),
      unitCount: 1,
      spaces: [],
    };

    applyProject({
      ...next,
      unitTypes: [...next.unitTypes, type],
    });

    setActiveTypeId(type.id);
    setActiveSpaceId(null);
    setNewTypeName("");
  }

  function updateType(name: string, unitCount: number) {
    const next = readCurrentProject();

    applyProject({
      ...next,
      unitTypes: next.unitTypes.map((type) =>
        type.id === activeTypeId ? { ...type, name, unitCount } : type,
      ),
    });
  }

  function deleteType() {
    if (!activeType) return;

    if (
      !window.confirm(
        `${activeType.name} 타입과 그 안의 모든 공간을 삭제할까요? 이 삭제는 실행 취소할 수 없습니다.`,
      )
    ) {
      return;
    }

    const next = readCurrentProject();
    const types = next.unitTypes.filter((type) => type.id !== activeTypeId);

    applyProject({ ...next, unitTypes: types });

    setActiveTypeId(types[0]?.id ?? null);
    setActiveSpaceId(types[0]?.spaces[0]?.id ?? null);
  }

  function addSpace() {
    if (!activeTypeId || !newSpaceName.trim()) {
      setError("타입을 선택하고 추가할 공간명을 입력하세요.");
      return;
    }

    const next = readCurrentProject();
    const space = createSpace(newSpaceName.trim());

    applyProject({
      ...next,
      unitTypes: next.unitTypes.map((type) =>
        type.id === activeTypeId
          ? { ...type, spaces: [...type.spaces, space] }
          : type,
      ),
    });

    setActiveSpaceId(space.id);
    setNewSpaceName("");
  }

  function deleteSpace() {
    if (!activeType || !activeSpace) return;

    if (
      !window.confirm(
        `${activeSpace.siteInput.name} 공간과 요소·조정값을 삭제할까요? 이 삭제는 실행 취소할 수 없습니다.`,
      )
    ) {
      return;
    }

    const next = readCurrentProject();
    const type = next.unitTypes.find((item) => item.id === activeTypeId);

    const spaces = (type?.spaces ?? []).filter(
      (space) => space.id !== activeSpaceId,
    );

    applyProject({
      ...next,
      unitTypes: next.unitTypes.map((item) =>
        item.id === activeTypeId ? { ...item, spaces } : item,
      ),
    });

    setActiveSpaceId(spaces[0]?.id ?? null);
  }

  function calculateAll() {
    const next = readCurrentProject();
    setProject(next);

    try {
      setReport(createHousingReport(next));
      setReportStale(false);
      setError("");
    } catch (caught) {
      setReportStale(true);
      setError(
        caught instanceof Error ? caught.message : "전체 계산에 실패했습니다.",
      );
    }
  }

  function handleSaved(project: HousingProject) {
    setProject(project);
    setDirty(false);
  }

  function handleRestore(
    project: HousingProject,
    source: "storage" | "import" | "legacy",
  ) {
    const restored = structuredClone(project);
    const firstType = restored.unitTypes[0];

    setProject(restored);

    setActiveTypeId(firstType?.id ?? null);
    setActiveSpaceId(firstType?.spaces[0]?.id ?? null);

    setNewTypeName("");
    setNewSpaceName("");

    // 이전 전체 결과를 새 프로젝트에 섞지 않습니다.
    setReport(null);
    setReportStale(false);
    setError("");

    setDirty(source !== "storage");
    setEditorEpoch((previous) => previous + 1);
  }

  function recoverHousingDraft(project: HousingProject) {
    handleRestore(
      {
        ...project,
        id: crypto.randomUUID(),
      },
      "import",
    );
  }

  function handleDownloadHousingCsv() {
    if (!report || reportStale) return;

    try {
      downloadText(
        `ceilplan-housing-result-${Date.now()}.csv`,
        "\uFEFF" + housingReportToCsv(report),
        "text/csv;charset=utf-8",
      );

      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "CSV를 생성하지 못했습니다.",
      );
    }
  }

  return (
    <div className="cp-housing-page">
      <header className="border-b border-[var(--cp-border)] bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">
              작업 공간 / 다중 공간
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              세대 타입·공간 관리
            </h1>
          </div>

          <Link
            href="/"
            onClick={(event) => {
              if (
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }

              if (
                dirty &&
                !window.confirm(
                  "저장하지 않은 변경사항이 있습니다. 단일 공간 화면으로 이동할까요?",
                )
              ) {
                event.preventDefault();
              }
            }}
            className="cp-button-secondary"
          >
            단일 공간으로
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1">
            <span className="mb-2 block text-xs font-medium text-slate-700">
              프로젝트명
            </span>

            <input
              value={project.name}
              onChange={(event) => {
                const name = event.target.value;

                setProject((previous) => ({
                  ...previous,
                  name,
                }));

                setDirty(true);
                setReportStale(true);
              }}
              placeholder="현장 또는 프로젝트 이름"
              className="cp-input"
            />
          </label>

          <span
            className={`rounded-md px-3 py-2 text-xs font-medium ${
              dirty
                ? "bg-amber-50 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {dirty ? "미저장 변경사항" : "미저장 변경사항 없음"}
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          프로젝트 안에 세대 타입을 만들고, 한 세대의 공간을 구성합니다. 타입별
          세대 수는 전체 계산에 적용됩니다.
        </p>
      </header>

      <div className="cp-housing-section">
        <HousingProjectManager
          getProject={readCurrentProject}
          dirty={dirty}
          onSaved={handleSaved}
          onLoad={handleRestore}
        />
      </div>

      <div className="cp-housing-section">
        <DraftRecovery
          storageKey={HOUSING_DRAFT_KEY}
          dirty={dirty}
          readData={readCurrentProject}
          normalize={normalizeHousingDraft}
          onRecover={recoverHousingDraft}
        />
      </div>

      <section
        aria-labelledby="housing-selection-title"
        className="cp-housing-section cp-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="housing-selection-title" className="cp-title">
            편집할 공간
          </h2>

          <span className="text-[11px] text-slate-500">
            {project.unitTypes.length}개 타입
            {activeType && ` · 선택 타입 ${activeType.spaces.length}개 공간`}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-2 block text-xs font-medium text-slate-700">
              세대 타입
            </span>

            <select
              value={activeTypeId ?? ""}
              disabled={project.unitTypes.length === 0}
              onChange={(event) => selectType(event.target.value)}
              className="cp-input"
            >
              <option value="" disabled>
                타입을 추가하세요
              </option>

              {project.unitTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} · {type.unitCount}세대
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-2 block text-xs font-medium text-slate-700">
              공간
            </span>

            <select
              value={activeSpaceId ?? ""}
              disabled={!activeType || activeType.spaces.length === 0}
              onChange={(event) => selectSpace(event.target.value)}
              className="cp-input"
            >
              <option value="" disabled>
                공간을 추가하세요
              </option>

              {activeType?.spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.siteInput.name || "이름 없는 공간"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <details
          open={project.unitTypes.length === 0}
          className="cp-tool-section mt-4"
        >
          <summary className="cp-tool-summary">
            <span className="cp-tool-heading">
              <span className="cp-tool-title">타입·공간 추가 및 관리</span>
            </span>

            <span className="cp-tool-description">
              새 타입·공간을 추가하거나 선택한 타입을 수정합니다.
            </span>
          </summary>

          <div className="cp-tool-body space-y-5">
            <div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="mb-2 block text-xs font-medium text-slate-700">
                    새 타입 이름
                  </span>

                  <input
                    value={newTypeName}
                    onChange={(event) => setNewTypeName(event.target.value)}
                    placeholder="예: 84A"
                    className="cp-input"
                  />
                </label>

                <button
                  type="button"
                  onClick={addType}
                  className="cp-button-secondary"
                >
                  타입 추가
                </button>
              </div>
            </div>

            {activeType && (
              <>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-700">
                    선택 타입: {activeType.name}
                  </p>

                  <UnitTypeEditor
                    key={`${editorEpoch}:${activeType.id}`}
                    unitType={activeType}
                    onApply={updateType}
                  />

                  <button
                    type="button"
                    onClick={deleteType}
                    className="mt-3 min-h-11 rounded-md px-3 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    선택 타입 삭제
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="mb-2 block text-xs font-medium text-slate-700">
                        {activeType.name}에 추가할 공간
                      </span>

                      <input
                        value={newSpaceName}
                        onChange={(event) =>
                          setNewSpaceName(event.target.value)
                        }
                        placeholder="예: 거실, 주방"
                        className="cp-input"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={addSpace}
                      className="cp-button-secondary"
                    >
                      공간 추가
                    </button>
                  </div>

                  {activeSpace && (
                    <button
                      type="button"
                      onClick={deleteSpace}
                      className="mt-3 min-h-11 rounded-md px-3 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      선택 공간 삭제
                    </button>
                  )}
                </div>
              </>
            )}

            <p className="text-[11px] leading-6 text-slate-500">
              타입 수정은 ‘타입 수정 적용’을 눌러 반영합니다. 적용된 공간 입력은
              전환 전에 보관됩니다. 공간 전환 시 편집 이력·미적용 입력·도면
              배경은 초기화됩니다.
            </p>
          </div>
        </details>

        {activeType && activeType.spaces.length === 0 && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            선택한 타입에 공간이 없습니다. ‘타입·공간 추가 및 관리’를 열어 첫
            공간을 추가하세요.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-[11px] leading-5 text-slate-500">
            공간별 발주 올림 후 타입별 세대 수를 적용합니다.
          </p>

          <button
            type="button"
            onClick={calculateAll}
            disabled={project.unitTypes.length === 0}
            className="cp-button-primary"
          >
            전체 타입·공간 계산
          </button>
        </div>
      </section>

      {report && (
        <section
          aria-labelledby="housing-report-title"
          className="cp-housing-section cp-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="housing-report-title" className="cp-title">
              전체 계산 요약
            </h2>

            <button
              type="button"
              onClick={handleDownloadHousingCsv}
              disabled={reportStale}
              className="cp-button-secondary"
            >
              전체 CSV 다운로드
            </button>
          </div>

          <p className="mt-2 break-words text-xs text-slate-600">
            {report.project.name}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            계산 시각{" "}
            {new Date(report.calculatedAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </p>

          {reportStale && (
            <p
              role="status"
              className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900"
            >
              아래는 이전 전체 계산 결과입니다. 전체 타입·공간 계산을 다시
              실행하세요.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-xs text-slate-500">전체 세대·면적</p>

              <p className="mt-2 break-words text-lg font-semibold tabular-nums">
                {report.result.totalUnitCount.toLocaleString("ko-KR")}세대
              </p>

              <p className="mt-1 text-xs text-slate-600">
                {report.result.totalAreaM2.toLocaleString("ko-KR")} ㎡
              </p>
            </div>

            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                전체 예상 자재비 · VAT 별도
              </p>

              <p className="mt-2 break-words text-lg font-semibold tabular-nums">
                {money(report.result.totalEstimatedCost)}
              </p>
            </div>
          </div>

          <ToolSection
            title="타입·공간별 금액"
            description="한 세대와 타입 전체 금액을 구분해서 확인합니다."
            className="mt-4"
          >
            <ul className="space-y-3">
              {report.result.unitTypes.map((type) => (
                <li
                  key={type.unitTypeId}
                  className="rounded-md bg-slate-50 p-3"
                >
                  <p className="break-words text-sm font-semibold">
                    {type.unitTypeName} · {type.unitCount}세대
                  </p>

                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    한 세대: {money(type.costPerUnit)}
                    <br />
                    타입 전체: {money(type.totalEstimatedCost)}
                  </p>

                  <ul className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                    {type.spaces.map((space) => (
                      <li
                        key={space.spaceId}
                        className="text-xs leading-5 text-slate-600"
                      >
                        <span className="font-medium">{space.spaceName}</span>
                        {" · "}
                        {money(space.result.totalEstimatedCost)}
                        {" · 한 공간·한 세대 기준"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </ToolSection>

          <p className="mt-3 text-[11px] leading-6 text-slate-500">
            공간 간 잔재 공유와 공동 발주 최적화는 포함하지 않습니다. 단가
            미입력이 있으면 전체 금액은 미완성으로 표시합니다.
          </p>
        </section>
      )}

      {activeSpace ? (
        <div id="dashboard" className="min-w-0">
          <CeilingWorkspace
            key={`${editorEpoch}:${activeTypeId}:${activeSpace.id}`}
            ref={editorRef}
            spaceSession={{
              initialSpace: activeSpace,
              onEdit: handleEditorChange,
            }}
          />
        </div>
      ) : (
        <section className="cp-housing-section rounded-lg border border-dashed border-slate-300 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700">
            편집할 공간을 준비하세요
          </h2>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            저장한 프로젝트를 열거나, 타입을 만든 뒤 거실·주방 등의 공간을
            추가하세요. 공간을 선택하면 설계 캔버스와 입력 패널이 표시됩니다.
          </p>
        </section>
      )}
    </div>
  );
}
