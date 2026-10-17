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
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">세대 타입·공간 관리</h1>

          <Link
            href="/"
            onClick={(event) => {
              if (
                dirty &&
                !window.confirm(
                  "저장하지 않은 다중 공간 입력이 사라집니다. 단일 공간 화면으로 이동할까요?",
                )
              ) {
                event.preventDefault();
              }
            }}
            className="cp-button-secondary"
          >
            단일 공간 화면
          </Link>
        </div>

        <p className="mt-3 text-sm leading-6 text-amber-800">
          다중 공간 프로젝트는 브라우저에 저장할 수 있습니다. 다른 기기와
          동기화되지 않으므로 필요한 자료는 JSON으로 백업하세요.
        </p>

        <label className="mt-4 block max-w-xl text-sm font-medium">
          프로젝트명
          <input
            value={project.name}
            onChange={(event) => {
              const name = event.target.value;

              setProject((previous) => ({ ...previous, name }));
              setDirty(true);
              setReportStale(true);
            }}
            className="cp-input mt-2"
          />
        </label>
      </header>

      <div className="m-4 sm:m-6">
        <HousingProjectManager
          getProject={readCurrentProject}
          dirty={dirty}
          onSaved={handleSaved}
          onLoad={handleRestore}
        />
      </div>

      <section className="m-4 rounded-xl border border-slate-200 bg-white p-4 sm:m-6">
        <h2 className="cp-title">세대 타입</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {project.unitTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => selectType(type.id)}
              aria-pressed={activeTypeId === type.id}
              className={
                activeTypeId === type.id
                  ? "cp-button-primary"
                  : "cp-button-secondary"
              }
            >
              {type.name} · {type.unitCount}세대
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-medium">
            새 타입 이름
            <input
              value={newTypeName}
              onChange={(event) => setNewTypeName(event.target.value)}
              placeholder="예: 84A"
              className="cp-input mt-2"
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

        {activeType && (
          <>
            <UnitTypeEditor
              key={`${editorEpoch}:${activeType.id}`}
              unitType={activeType}
              onApply={updateType}
            />

            <button
              type="button"
              onClick={deleteType}
              className="mt-3 min-h-11 rounded px-3 text-sm text-red-700"
            >
              선택 타입 삭제
            </button>

            <h3 className="mt-5 text-sm font-semibold">
              {activeType.name}의 공간
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {activeType.spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => selectSpace(space.id)}
                  aria-pressed={activeSpaceId === space.id}
                  className={
                    activeSpaceId === space.id
                      ? "cp-button-primary"
                      : "cp-button-secondary"
                  }
                >
                  {space.siteInput.name || "이름 없는 공간"}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-sm font-medium">
                새 공간 이름
                <input
                  value={newSpaceName}
                  onChange={(event) => setNewSpaceName(event.target.value)}
                  placeholder="예: 거실"
                  className="cp-input mt-2"
                />
              </label>

              <button
                type="button"
                onClick={addSpace}
                className="cp-button-secondary"
              >
                공간 추가
              </button>

              {activeSpace && (
                <button
                  type="button"
                  onClick={deleteSpace}
                  className="min-h-11 rounded px-3 text-sm text-red-700"
                >
                  선택 공간 삭제
                </button>
              )}
            </div>
          </>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          타입 변경은 ‘타입 수정 적용’, 요소·조정값 변경은 각 ‘수정 적용’을
          눌러주세요. 적용된 입력은 공간 전환 전에 보관됩니다. 전환하면 해당
          편집기의 실행 취소 이력과 적용 전 임시 입력은 초기화됩니다.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={calculateAll}
          className="cp-button-primary mt-4"
        >
          전체 타입·공간 계산
        </button>
      </section>

      {report && (
        <section className="cp-card m-4 sm:m-6">
          <h2 className="cp-title">{report.project.name} · 전체 계산 요약</h2>

          <button
            type="button"
            onClick={handleDownloadHousingCsv}
            disabled={reportStale}
            className="cp-button-secondary mt-3"
          >
            전체 산출 CSV 다운로드
          </button>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            계산 시각:{" "}
            {new Date(report.calculatedAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </p>

          {reportStale && (
            <p role="status" className="mt-3 text-sm text-amber-800">
              아래는 이전 계산입니다. 전체 계산을 다시 실행하세요.
            </p>
          )}

          <p className="mt-3 text-sm">
            {report.result.totalUnitCount}세대 ·{" "}
            {report.result.totalAreaM2.toLocaleString("ko-KR")}㎡
          </p>

          <p className="mt-2 text-xl font-bold text-emerald-700">
            {money(report.result.totalEstimatedCost)}
          </p>

          <ul className="mt-4 space-y-3">
            {report.result.unitTypes.map((type) => (
              <li
                key={type.unitTypeId}
                className="rounded-lg bg-slate-50 p-3 text-sm"
              >
                <p className="font-semibold">
                  {type.unitTypeName} · {type.unitCount}세대
                </p>

                <p className="mt-1">
                  한 세대: {money(type.costPerUnit)}
                  {" / "}
                  타입 전체: {money(type.totalEstimatedCost)}
                </p>

                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {type.spaces.map((space) => (
                    <li key={space.spaceId}>
                      {space.spaceName}:{" "}
                      {money(space.result.totalEstimatedCost)}
                      {" · 한 공간·한 세대 기준"}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            공간별 발주 올림 후 합산하고 세대 수를 적용합니다. 공간 간 잔재
            공유와 공동 발주 최적화는 포함하지 않습니다.
          </p>
        </section>
      )}

      {activeSpace ? (
        <div id="dashboard">
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
        <p className="m-6 text-sm text-slate-500">
          타입과 공간을 추가한 뒤 편집하세요.
        </p>
      )}
    </div>
  );
}
