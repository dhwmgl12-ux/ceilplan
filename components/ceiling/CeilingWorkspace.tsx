"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type {
  Adjustment,
  CalculationSnapshot,
  CeilingFeature,
  MaterialInput,
  Project,
  SiteInput,
} from "@/types/ceilplan";

import {
  calculateBase,
  validateAdjustments,
  validateInputs,
} from "@/lib/calculations/base";
import ProjectHeader from "@/components/layout/ProjectHeader";
import InputPanel from "./InputPanel";
import MaterialInputPanel from "./MaterialInputPanel";
import CeilingPreview from "./CeilingPreview";
import ResultsPanel from "./ResultsPanel";
import ProjectManager, { type ProjectManagerHandle } from "./ProjectManager";
import Sidebar, { type SidebarMenu } from "@/components/layout/Sidebar";
import FeatureInputPanel from "./FeatureInputPanel";
import AdjustmentInputPanel from "./AdjustmentInputPanel";
import UsageGuide from "./UsageGuide";
import { tryGetRoomGeometry } from "@/lib/geometry/room";
import {
  createEditorHistory,
  editorHistoryReducer,
} from "@/lib/editor-history";

interface WorkspaceDocument {
  inputs: SiteInput;
  materialInputs: MaterialInput;
  features: CeilingFeature[];
  adjustments: Adjustment[];
}

function createEmptyDocument(): WorkspaceDocument {
  return {
    inputs: {
      name: "",
      widthMm: "",
      lengthMm: "",
    },

    materialInputs: {
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
  };
}

export default function CeilingWorkspace() {
  const [history, dispatchHistory] = useReducer(
    editorHistoryReducer<WorkspaceDocument>,
    undefined,
    () => createEditorHistory(createEmptyDocument()),
  );

  const { inputs, materialInputs, features, adjustments } = history.present;

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const [dirty, setDirty] = useState(false);
  const [snapshot, setSnapshot] = useState<CalculationSnapshot | null>(null);

  const result = snapshot?.result ?? null;

  const [errors, setErrors] = useState<string[]>([]);
  const [stale, setStale] = useState(false);
  const [featureFormKey, setFeatureFormKey] = useState(0);
  const [historyMessage, setHistoryMessage] = useState("");

  const errorSummaryRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (errors.length === 0) return;

    const frame = requestAnimationFrame(() => {
      const element = errorSummaryRef.current;

      element?.focus({ preventScroll: true });
      element?.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [errors]);

  const room = tryGetRoomGeometry(inputs);
  const areaM2 = room?.areaM2 ?? null;

  function handleInputChange(field: keyof SiteInput, value: string) {
    changeDocument((previous) => ({
      ...previous,
      inputs: {
        ...previous.inputs,
        [field]: value,
      },
    }));
  }

  function handleMaterialChange(field: keyof MaterialInput, value: string) {
    changeDocument((previous) => ({
      ...previous,
      materialInputs: {
        ...previous.materialInputs,
        [field]: value,
      },
    }));
  }

  function handleCalculate() {
    const validationErrors = [
      ...validateInputs(inputs, materialInputs),
      ...validateAdjustments(inputs, features, adjustments),
    ];

    if (validationErrors.length > 0) {
      setErrors(validationErrors);

      if (snapshot) {
        setStale(true);
      }

      return;
    }

    try {
      // 계산에 사용한 값과 Snapshot에 보관할 값을 일치시킵니다.
      const calculationInput = structuredClone({
        siteInput: inputs,
        materialInput: materialInputs,
        features,
        adjustments,
      });

      const nextResult = calculateBase(
        calculationInput.siteInput,
        calculationInput.materialInput,
        {
          features: calculationInput.features,
          adjustments: calculationInput.adjustments,
        },
      );

      const nextSnapshot: CalculationSnapshot = {
        calculatedAt: new Date().toISOString(),

        // CeilPlan 내부 계산 정책 버전입니다.
        // 공식 시공 기준의 버전이 아닙니다.
        calculationRuleVersion: "shaped-area-manual-adjustment-v1",

        ...calculationInput,
        result: nextResult,
      };

      setSnapshot(nextSnapshot);
      setErrors([]);
      setStale(false);
      setDirty(true);

      moveAfterCalculation("results");
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "계산 중 오류가 발생했습니다.",
      ]);

      // 실패한 계산으로 이전 Snapshot을 덮어쓰지 않습니다.
      if (snapshot) {
        setStale(true);
      }
    }
  }

  function handleLoadProject(
    project: Project,
    source: "storage" | "import" | "example",
  ) {
    dispatchHistory({
      type: "reset",
      value: {
        inputs: { ...project.siteInput },
        materialInputs: { ...project.materialInput },
        features: (project.features ?? []).map((feature) => ({
          ...feature,
        })),
        adjustments: (project.adjustments ?? []).map((adjustment) => ({
          ...adjustment,
        })),
      },
    });

    setFeatureFormKey((previous) => previous + 1);

    setSnapshot(project.snapshot ? structuredClone(project.snapshot) : null);

    setErrors([]);
    setStale(Boolean(project.snapshot));
    setDirty(source !== "storage");
    setHistoryMessage("");
  }

  function handleNewProject() {
    dispatchHistory({
      type: "reset",
      value: createEmptyDocument(),
    });

    setFeatureFormKey((previous) => previous + 1);

    setSnapshot(null);
    setErrors([]);
    setStale(false);
    setDirty(false);
    setHistoryMessage("");
  }

  function markCalculationChanged() {
    setDirty(true);
    setErrors([]);

    if (result) {
      setStale(true);
    }
  }

  function changeDocument(
    update: (previous: WorkspaceDocument) => WorkspaceDocument,
  ) {
    dispatchHistory({
      type: "change",
      update,
    });

    setHistoryMessage("");
    markCalculationChanged();
  }

  function handleAddFeature(feature: CeilingFeature) {
    changeDocument((previous) => ({
      ...previous,
      features: [...previous.features, { ...feature }],
    }));
  }

  function handleUpdateFeature(nextFeature: CeilingFeature) {
    changeDocument((previous) => ({
      ...previous,
      features: previous.features.map((feature) =>
        feature.id === nextFeature.id ? { ...nextFeature } : feature,
      ),
    }));
  }

  function handleDeleteFeature(id: string) {
    const linkedCount = adjustments.filter(
      (adjustment) => adjustment.featureId === id,
    ).length;

    if (
      linkedCount > 0 &&
      !window.confirm(
        `이 요소에 연결된 조정값 ${linkedCount}개도 함께 삭제됩니다. 삭제할까요?`,
      )
    ) {
      return;
    }

    // 요소와 연결된 조정값 삭제를 하나의 변경으로 기록합니다.
    changeDocument((previous) => ({
      ...previous,
      features: previous.features.filter((feature) => feature.id !== id),
      adjustments: previous.adjustments.filter(
        (adjustment) => adjustment.featureId !== id,
      ),
    }));
  }

  function handleAddAdjustment(adjustment: Adjustment) {
    changeDocument((previous) => ({
      ...previous,
      adjustments: [...previous.adjustments, { ...adjustment }],
    }));
  }

  function handleUpdateAdjustment(nextAdjustment: Adjustment) {
    changeDocument((previous) => ({
      ...previous,
      adjustments: previous.adjustments.map((adjustment) =>
        adjustment.id === nextAdjustment.id
          ? { ...nextAdjustment }
          : adjustment,
      ),
    }));
  }

  function handleDeleteAdjustment(id: string) {
    changeDocument((previous) => ({
      ...previous,
      adjustments: previous.adjustments.filter(
        (adjustment) => adjustment.id !== id,
      ),
    }));
  }

  function handleUndo() {
    if (!canUndo) return;

    dispatchHistory({ type: "undo" });

    // 요소·조정값 패널의 수정 중 임시 입력을 초기화합니다.
    setFeatureFormKey((previous) => previous + 1);

    markCalculationChanged();
    setHistoryMessage("직전 편집을 취소했습니다.");
  }

  function handleRedo() {
    if (!canRedo) return;

    dispatchHistory({ type: "redo" });

    setFeatureFormKey((previous) => previous + 1);

    markCalculationChanged();
    setHistoryMessage("취소한 편집을 다시 적용했습니다.");
  }

  const projectManagerRef = useRef<ProjectManagerHandle>(null);

  const [activeMenu, setActiveMenu] = useState<SidebarMenu>("dashboard");

  function handleNavigate(menu: SidebarMenu) {
    setActiveMenu(menu);

    if (menu === "projects") {
      projectManagerRef.current?.openList();
    }

    const targetId = menu === "dashboard" ? "dashboard" : menu;

    document.getElementById(targetId)?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }

  function moveToSection(id: "inputs" | "preview" | "results") {
    setActiveMenu(id === "results" ? "results" : "dashboard");

    document.getElementById(id)?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }

  function moveAfterCalculation(id: "inputs" | "results") {
    if (!window.matchMedia("(max-width: 1279px)").matches) {
      return;
    }

    requestAnimationFrame(() => {
      moveToSection(id);
    });
  }
  return (
    <div className="min-w-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-blue-700 focus:shadow-lg"
      >
        본문으로 바로가기
      </a>

      <Sidebar activeMenu={activeMenu} onNavigate={handleNavigate} />
      <ProjectHeader projectName={inputs.name} areaM2={areaM2}>
        <ProjectManager
          ref={projectManagerRef}
          siteInput={inputs}
          materialInput={materialInputs}
          features={features}
          adjustments={adjustments}
          snapshot={snapshot}
          dirty={dirty}
          onLoad={handleLoadProject}
          onNew={handleNewProject}
          onSaved={() => setDirty(false)}
        />
      </ProjectHeader>

      <nav
        aria-label="작업 영역 바로가기"
        className="sticky top-0 z-10 grid grid-cols-3 gap-2 border-b border-slate-200 bg-white px-4 py-2 min-[1280px]:hidden"
      >
        <button
          type="button"
          onClick={() => moveToSection("inputs")}
          className="cp-button-secondary"
        >
          입력
        </button>

        <button
          type="button"
          onClick={() => moveToSection("preview")}
          className="cp-button-secondary"
        >
          미리보기
        </button>

        <button
          type="button"
          onClick={() => moveToSection("results")}
          className="cp-button-secondary"
        >
          결과
        </button>
      </nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="p-4 pb-28 sm:p-6 sm:pb-28 min-[1280px]:pb-6"
      >
        <div className="mb-4">
          <UsageGuide />
        </div>

        <div className="mb-4">
          <UsageGuide />
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
          <div
            role="group"
            aria-label="편집 이력"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="cp-button-secondary"
            >
              실행 취소
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="cp-button-secondary"
            >
              다시 실행
            </button>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            적용된 입력과 요소 변경을 되돌립니다. 수정 중인 임시 입력은
            초기화되며, 계산 결과는 다시 계산해야 합니다.
          </p>

          <p role="status" className="mt-1 text-xs text-blue-700">
            {historyMessage}
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)]">
          <div id="inputs" className="min-w-0 space-y-4">
            <InputPanel inputs={inputs} onChange={handleInputChange} />

            <MaterialInputPanel
              inputs={materialInputs}
              onChange={handleMaterialChange}
            />

            <div className="cp-card">
              {errors.length > 0 && (
                <div
                  ref={errorSummaryRef}
                  id="calculation-errors"
                  role="alert"
                  tabIndex={-1}
                  aria-labelledby="calculation-errors-title"
                  className="mb-4 rounded-lg bg-red-50 p-3"
                >
                  <p
                    id="calculation-errors-title"
                    className="text-sm font-semibold text-red-800"
                  >
                    입력값을 확인해 주세요.
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-red-700">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={handleCalculate}
                aria-describedby={
                  errors.length > 0 ? "calculation-errors" : undefined
                }
                className="cp-button-primary w-full"
              >
                예상 자재 계산하기
              </button>

              <p role="status" className="mt-3 text-xs text-slate-500">
                {stale
                  ? "입력값이 변경되어 재계산이 필요합니다."
                  : result
                    ? "계산이 완료되었습니다."
                    : "입력 후 계산 버튼을 눌러주세요."}
              </p>
            </div>
            <details
              key={featureFormKey}
              className="group rounded-xl border border-slate-200 bg-white"
            >
              <summary className="cursor-pointer rounded-xl px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                <span className="ml-1 text-sm font-semibold">
                  현장 요소 입력
                </span>

                <span className="ml-2 text-xs text-slate-500">
                  {features.length}개
                </span>
              </summary>

              <div className="border-t border-slate-100">
                <FeatureInputPanel
                  inputs={inputs}
                  features={features}
                  onAdd={handleAddFeature}
                  onUpdate={handleUpdateFeature}
                  onDelete={handleDeleteFeature}
                />
              </div>
            </details>

            <AdjustmentInputPanel
              key={`adjustments-${featureFormKey}`}
              features={features}
              adjustments={adjustments}
              onAdd={handleAddAdjustment}
              onUpdate={handleUpdateAdjustment}
              onDelete={handleDeleteAdjustment}
            />
          </div>

          <div id="preview" className="min-w-0">
            <CeilingPreview
              key={featureFormKey}
              inputs={inputs}
              features={features}
              onAdd={handleAddFeature}
              onUpdate={handleUpdateFeature}
            />
          </div>

          <ResultsPanel snapshot={snapshot} stale={stale} />
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[1280px]:hidden">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs leading-5 text-slate-500">
            {stale
              ? "입력이 변경되어 재계산이 필요합니다."
              : result
                ? "계산 결과를 확인하세요."
                : "조건을 입력하고 계산하세요."}
          </p>

          <button
            type="button"
            onClick={handleCalculate}
            className="cp-button-primary shrink-0"
          >
            {stale ? "다시 계산" : "계산하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
