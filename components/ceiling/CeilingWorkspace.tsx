"use client";

import {
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type Ref,
} from "react";
import type {
  Adjustment,
  CalculationSnapshot,
  CeilingFeature,
  MaterialInput,
  Project,
  SiteInput,
  StoredProjectV2,
} from "@/types/ceilplan";
import DraftRecovery from "./DraftRecovery";
import { SINGLE_DRAFT_KEY } from "@/lib/draft-storage";
import { normalizeProjectData } from "@/lib/project-io";

import {
  calculateBase,
  validateAdjustments,
  validateInputs,
} from "@/lib/calculations/base";
import InputPanel from "./InputPanel";
import MaterialInputPanel, {
  type MaterialInputPanelHandle,
} from "./MaterialInputPanel";
import CeilingPreview from "./CeilingPreview";
import ResultsPanel from "./ResultsPanel";
import ProjectManager, { type ProjectManagerHandle } from "./ProjectManager";
import type { SidebarMenu } from "@/components/layout/Sidebar";
import FeatureInputPanel from "./FeatureInputPanel";
import FeatureToolsPanel from "./FeatureToolsPanel";
import AdjustmentInputPanel from "./AdjustmentInputPanel";
import UsageGuide from "./UsageGuide";
import { tryGetRoomGeometry } from "@/lib/geometry/room";
import {
  createEditorHistory,
  editorHistoryReducer,
} from "@/lib/editor-history";

import type { CeilingSpace } from "@/types/housing-project";

import ReviewPanel from "./ReviewPanel";
import { collectReviewItems, type ReviewTarget } from "@/lib/review";

import CalculationPlansPanel from "./CalculationPlansPanel";

import FeaturePropertiesPanel from "./FeaturePropertiesPanel";

import ToolSection from "@/components/ui/ToolSection";

import WorkspaceTabs, { type WorkspaceTab } from "./WorkspaceTabs";

export interface SpaceEditorHandle {
  readSpace: () => CeilingSpace | null;
}

interface CeilingWorkspaceProps {
  ref?: Ref<SpaceEditorHandle>;

  spaceSession?: {
    initialSpace: CeilingSpace;
    onEdit: () => void;
  };
}

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

export default function CeilingWorkspace({
  ref,
  spaceSession,
}: CeilingWorkspaceProps) {
  const initialSpace = spaceSession?.initialSpace;
  const isSpaceEditor = Boolean(spaceSession);

  const [history, dispatchHistory] = useReducer(
    editorHistoryReducer<WorkspaceDocument>,
    undefined,
    () =>
      createEditorHistory(
        initialSpace
          ? {
              inputs: initialSpace.siteInput,
              materialInputs: initialSpace.materialInput,
              features: initialSpace.features,
              adjustments: initialSpace.adjustments,
            }
          : createEmptyDocument(),
      ),
  );

  const { inputs, materialInputs, features, adjustments } = history.present;

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const [dirty, setDirty] = useState(false);
  const [snapshot, setSnapshot] = useState<CalculationSnapshot | null>(() =>
    initialSpace?.snapshot ? structuredClone(initialSpace.snapshot) : null,
  );

  const result = snapshot?.result ?? null;

  const [errors, setErrors] = useState<string[]>([]);
  const [stale, setStale] = useState(Boolean(initialSpace?.snapshot));
  const [featureFormKey, setFeatureFormKey] = useState(0);
  const [projectManagerKey, setProjectManagerKey] = useState(0);
  const [historyMessage, setHistoryMessage] = useState("");

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("SETUP");

  const [editArea, setEditArea] = useState<"tools" | "canvas" | "properties">(
    "canvas",
  );
  const editingSpaceId = initialSpace?.id;

  useImperativeHandle(ref, () => ({
    readSpace() {
      if (!editingSpaceId) return null;

      return structuredClone({
        id: editingSpaceId,
        siteInput: inputs,
        materialInput: materialInputs,
        features,
        adjustments,
        snapshot,
      });
    },
  }));

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );

  // 삭제된 요소의 ID는 선택된 것으로 취급하지 않습니다.
  const activeFeatureId = features.some(
    (feature) => feature.id === selectedFeatureId,
  )
    ? selectedFeatureId
    : null;

  const featureDetailsRef = useRef<HTMLDetailsElement>(null);

  function handleSelectFeature(id: string | null) {
    if (id !== null && !features.some((feature) => feature.id === id)) {
      return;
    }

    setSelectedFeatureId(id);
  }

  function handleShowSelectedInList() {
    if (!activeFeatureId) return;

    moveToSection("inputs");

    if (featureDetailsRef.current) {
      featureDetailsRef.current.open = true;
    }

    requestAnimationFrame(() => {
      const button = document.getElementById(
        `feature-select-${activeFeatureId}`,
      );

      button?.focus({ preventScroll: true });
      button?.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
    });
  }

  function handleShowAdjustments() {
    openEditArea("properties");

    requestAnimationFrame(() => {
      const element = document.getElementById("adjustment-input-area");

      element?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });

      element?.focus({ preventScroll: true });
    });
  }

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const materialPanelRef = useRef<MaterialInputPanelHandle>(null);

  useEffect(() => {
    // 다중 공간 화면의 이탈 확인은 부모가 담당합니다.
    if (isSpaceEditor || !dirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty, isSpaceEditor]);

  useEffect(() => {
    if (errors.length === 0) return;

    const frame = requestAnimationFrame(() => {
      // 단가 오류가 있으면 펼친 뒤 해당 입력으로 이동합니다.
      if (materialPanelRef.current?.focusFirstPriceError()) {
        return;
      }

      // 나머지 오류는 기존 오류 목록으로 이동합니다.
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

  const reviewItems = collectReviewItems({
    siteInput: inputs,
    materialInput: materialInputs,
    features,
    adjustments,
    hasSnapshot: snapshot !== null,
    stale,
    dirty: !isSpaceEditor && dirty,
    calculationErrors: errors,
  });

  function handleReviewNavigate(target: ReviewTarget) {
    if (target === "FEATURES") {
      openEditArea("tools");

      if (featureDetailsRef.current) {
        featureDetailsRef.current.open = true;
      }

      requestAnimationFrame(() => {
        const element = featureDetailsRef.current;

        element?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });

        element
          ?.querySelector<HTMLElement>("summary")
          ?.focus({ preventScroll: true });
      });

      return;
    }

    if (target === "SAVE") {
      const element = document.getElementById("project-save-area");

      element?.scrollIntoView({
        behavior: "auto",
        block: "center",
      });

      element?.focus({ preventScroll: true });
      return;
    }

    moveToSection(target === "RESULTS" ? "results" : "inputs");
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
      setActiveTab("SETUP");

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
      spaceSession?.onEdit();

      moveAfterCalculation("results");
    } catch (error) {
      setActiveTab("SETUP");

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
    setSelectedFeatureId(null);

    moveToSection("inputs");
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
    setSelectedFeatureId(null);
  }

  function readSingleDraft(): StoredProjectV2 {
    return {
      id: "single-recovery-draft",

      // 임시 데이터 검증을 위한 고정값입니다.
      // 실제 임시저장 시각은 임시저장 모듈이 별도로 기록합니다.
      updatedAt: "2000-01-01T00:00:00.000Z",

      siteInput: inputs,
      materialInput: materialInputs,
      features,
      adjustments,
      snapshot,
    };
  }

  function recoverSingleDraft(project: StoredProjectV2) {
    handleLoadProject(
      {
        ...project,
        id: crypto.randomUUID(),
      },
      "import",
    );

    setProjectManagerKey((previous) => previous + 1);
  }

  function markCalculationChanged() {
    setDirty(true);
    setErrors([]);
    spaceSession?.onEdit();

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
    setSelectedFeatureId(feature.id);
  }
  function handleAddManyFeatures(nextFeatures: CeilingFeature[]) {
    if (nextFeatures.length === 0) return;

    const copied = nextFeatures.map((feature) => ({ ...feature }));

    changeDocument((previous) => ({
      ...previous,
      features: [...previous.features, ...copied],
    }));

    setSelectedFeatureId(copied[0].id);
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
    setSelectedFeatureId(null);
  }

  function handleRedo() {
    if (!canRedo) return;

    dispatchHistory({ type: "redo" });

    setFeatureFormKey((previous) => previous + 1);

    markCalculationChanged();
    setHistoryMessage("취소한 편집을 다시 적용했습니다.");
    setSelectedFeatureId(null);
  }

  const projectManagerRef = useRef<ProjectManagerHandle>(null);

  function handleNavigate(menu: SidebarMenu) {
    if (menu === "projects") {
      projectManagerRef.current?.openList();
      return;
    }

    moveToSection(menu === "results" ? "results" : "preview");
  }

  function moveToSection(id: "inputs" | "preview" | "results") {
    setActiveTab(
      id === "inputs" ? "SETUP" : id === "preview" ? "EDIT" : "REVIEW",
    );

    if (id === "preview") {
      setEditArea("canvas");
    }

    requestAnimationFrame(() => {
      const targetId = id === "results" ? "workspace-results" : id;

      const element = document.getElementById(targetId);

      element?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });

      element?.focus({ preventScroll: true });
    });
  }

  function openEditArea(area: "tools" | "canvas" | "properties") {
    setActiveTab("EDIT");
    setEditArea(area);
  }

  function moveAfterCalculation(id: "inputs" | "results") {
    moveToSection(id);
  }

  const showWelcome =
    !dirty &&
    snapshot === null &&
    !inputs.name.trim() &&
    !inputs.widthMm.trim() &&
    !inputs.lengthMm.trim() &&
    features.length === 0 &&
    adjustments.length === 0;

  return (
    <div className="cp-shell" data-embedded={isSpaceEditor}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-blue-700 focus:shadow-lg"
      >
        본문으로 바로가기
      </a>

      <div className="cp-shell-header">
        {isSpaceEditor ? (
          <header className="border-b border-blue-100 bg-white px-4 py-4 sm:px-6">
            <h2 className="text-xl font-bold">
              공간 편집: {inputs.name.trim() || "이름 없는 공간"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              이 영역의 결과는 선택한 공간 한 개·한 세대 기준입니다.
            </p>
          </header>
        ) : (
          <div id="project-save-area" tabIndex={-1}>
            <ProjectManager
              key={projectManagerKey}
              ref={projectManagerRef}
              siteInput={inputs}
              materialInput={materialInputs}
              features={features}
              adjustments={adjustments}
              snapshot={snapshot}
              dirty={dirty}
              areaM2={areaM2}
              stale={stale}
              onLoad={handleLoadProject}
              onNew={handleNewProject}
              onSaved={() => setDirty(false)}
              onCalculate={handleCalculate}
              onShowResults={() => moveToSection("results")}
            />
          </div>
        )}
      </div>

      <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

      <main id="main-content" tabIndex={-1} className="cp-shell-main">
        <div className="cp-shell-notices">
          {!isSpaceEditor && (
            <>
              <div className="mb-3">
                <UsageGuide
                  showWelcome={showWelcome}
                  onStart={() => moveToSection("inputs")}
                  onLoadExample={() => {
                    projectManagerRef.current?.loadExample();
                    moveToSection("inputs");
                  }}
                  onOpenProjects={() => handleNavigate("projects")}
                />
              </div>

              <DraftRecovery
                storageKey={SINGLE_DRAFT_KEY}
                dirty={dirty}
                readData={readSingleDraft}
                normalize={normalizeProjectData}
                onRecover={recoverSingleDraft}
              />
            </>
          )}
        </div>

        <div className="cp-shell-history">
          <div role="group" aria-label="편집 이력" className="flex gap-2">
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

          <p role="status" className="text-[11px] leading-5 text-slate-500">
            {historyMessage ||
              "작업 화면을 전환해도 같은 공간의 입력과 선택은 유지됩니다."}
          </p>

          <div
            role="group"
            aria-label="요소 편집 영역 선택"
            className={
              activeTab === "EDIT"
                ? "flex flex-wrap gap-1 min-[1280px]:hidden"
                : "hidden"
            }
          >
            {(
              [
                ["tools", "도구"],
                ["canvas", "캔버스"],
                ["properties", "속성"],
              ] as const
            ).map(([area, label]) => (
              <button
                key={area}
                type="button"
                onClick={() => setEditArea(area)}
                aria-pressed={editArea === area}
                className="cp-button-secondary"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div
          id="workspace-content"
          className="cp-task-workspace cp-shell-workspace"
          data-tab={activeTab}
          data-edit-area={editArea}
        >
          <div
            id="inputs"
            role="region"
            aria-label="공간과 자재 설정"
            tabIndex={0}
            className="cp-task-pane cp-task-setup cp-shell-pane space-y-4"
          >
            <div className="rounded-lg border border-[var(--cp-border)] bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-800">
                공간·자재 설정
              </h2>

              <p className="mt-2 text-xs leading-6 text-slate-500">
                공간 치수와 계산에 사용할 조건을 입력하세요. 현장 요소 배치와
                조정값은 요소 편집에서 관리합니다.
              </p>

              <button
                type="button"
                onClick={() => moveToSection("preview")}
                className="cp-button-secondary mt-3"
              >
                요소 편집으로 이동
              </button>
            </div>

            {errors.length > 0 && (
              <div
                ref={errorSummaryRef}
                id="calculation-errors"
                role="alert"
                tabIndex={-1}
                aria-labelledby="calculation-errors-title"
                className="rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <p
                  id="calculation-errors-title"
                  className="text-sm font-semibold text-red-800"
                >
                  입력값을 확인해 주세요.
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-red-700">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <InputPanel
              inputs={inputs}
              onChange={handleInputChange}
              nameLabel={isSpaceEditor ? "공간명" : "현장명"}
            />

            <MaterialInputPanel
              ref={materialPanelRef}
              inputs={materialInputs}
              onChange={handleMaterialChange}
              showValidation={errors.length > 0}
            />

            <p className="px-1 text-[11px] leading-6 text-slate-500">
              조건을 입력한 뒤 상단의 산출 계산을 실행하세요. 단가를 비워도
              수량은 계산할 수 있지만, 전체 예상 금액은 미완성으로 표시됩니다.
            </p>
          </div>

          <div
            id="workspace-tools"
            role="region"
            aria-label="현장 요소와 보조 도구"
            tabIndex={0}
            className="cp-task-pane cp-task-tools cp-shell-pane space-y-4"
          >
            <details
              ref={featureDetailsRef}
              key={featureFormKey}
              className="rounded-lg border border-slate-200 bg-white"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                현장 요소 입력·목록
                <span className="ml-2 text-xs text-slate-500">
                  {features.length}개
                </span>
              </summary>

              <div className="border-t border-slate-100">
                <FeatureInputPanel
                  inputs={inputs}
                  features={features}
                  activeFeatureId={activeFeatureId}
                  onSelectFeature={handleSelectFeature}
                  onAdd={handleAddFeature}
                  onUpdate={handleUpdateFeature}
                  onDelete={handleDeleteFeature}
                />
              </div>
            </details>

            <FeatureToolsPanel
              key={`feature-tools-${featureFormKey}`}
              inputs={inputs}
              features={features}
              activeFeatureId={activeFeatureId}
              onAddMany={handleAddManyFeatures}
            />
          </div>

          <div
            id="preview"
            role="region"
            aria-label="설계 캔버스"
            tabIndex={0}
            className="cp-task-pane cp-task-canvas cp-shell-pane"
          >
            <CeilingPreview
              key={featureFormKey}
              inputs={inputs}
              features={features}
              activeFeatureId={activeFeatureId}
              onSelectFeature={handleSelectFeature}
              onAdd={handleAddFeature}
              onUpdate={handleUpdateFeature}
              editable={activeTab === "EDIT"}
              onRequestEdit={() => moveToSection("preview")}
            />
          </div>

          <div
            id="workspace-properties"
            role="region"
            aria-label="선택 요소 속성과 조정값"
            tabIndex={0}
            className="cp-task-pane cp-task-properties cp-shell-pane space-y-4"
          >
            <FeaturePropertiesPanel
              key={`properties-${featureFormKey}`}
              inputs={inputs}
              features={features}
              adjustments={adjustments}
              activeFeatureId={activeFeatureId}
              onUpdate={handleUpdateFeature}
              onClearSelection={() => handleSelectFeature(null)}
              onShowInList={handleShowSelectedInList}
              onShowAdjustments={handleShowAdjustments}
            />

            <div id="adjustment-input-area" tabIndex={-1}>
              <AdjustmentInputPanel
                key={`adjustments-${featureFormKey}`}
                features={features}
                adjustments={adjustments}
                activeFeatureId={activeFeatureId}
                onSelectFeature={handleSelectFeature}
                onAdd={handleAddAdjustment}
                onUpdate={handleUpdateAdjustment}
                onDelete={handleDeleteAdjustment}
              />
            </div>
          </div>

          <div
            id="workspace-results"
            role="region"
            aria-label="산출 결과와 검토"
            tabIndex={0}
            className="cp-task-pane cp-task-review cp-shell-pane space-y-4"
          >
            <ResultsPanel snapshot={snapshot} stale={stale} />

            <ToolSection
              title="검토할 항목"
              description="현재 입력과 결과 상태를 확인합니다."
              status={`${reviewItems.length}개 항목`}
            >
              <ReviewPanel
                items={reviewItems}
                onNavigate={handleReviewNavigate}
              />
            </ToolSection>

            <ToolSection
              title="계산안 저장·비교"
              description="계산 당시 결과를 보관하고 비교합니다."
              status={
                !snapshot
                  ? "계산 후 저장 가능"
                  : stale
                    ? "재계산 필요"
                    : "현재 결과 저장 가능"
              }
            >
              <CalculationPlansPanel
                key={`calculation-plans-${featureFormKey}`}
                snapshot={snapshot}
                stale={stale}
              />
            </ToolSection>
          </div>
        </div>
      </main>

      <footer className="cp-shell-status" aria-label="작업 상태">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs font-medium text-slate-700">
            {isSpaceEditor ? "선택 공간 편집" : "단일 공간 작업"}
          </span>

          <span className="text-[11px] text-slate-500">단위 mm</span>

          <span
            className={`text-[11px] ${
              stale ? "text-amber-800" : "text-slate-600"
            }`}
          >
            {!snapshot
              ? "계산 결과 없음"
              : stale
                ? "재계산 필요"
                : "적용된 입력 기준 최신"}
          </span>

          {!isSpaceEditor && (
            <span className="text-[11px] text-slate-500">
              {dirty
                ? "프로젝트 미저장 변경사항 있음"
                : "프로젝트 미저장 변경사항 없음"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          className="cp-button-primary shrink-0"
        >
          {stale ? "다시 계산" : "산출 계산"}
        </button>
      </footer>
    </div>
  );
}
