"use client";

import { useRef, useState } from "react";
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

export default function CeilingWorkspace() {
  const [inputs, setInputs] = useState<SiteInput>({
    name: "",
    widthMm: "",
    lengthMm: "",
  });
  const [dirty, setDirty] = useState(false);

  const [materialInputs, setMaterialInputs] = useState<MaterialInput>({
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
  });

  const [snapshot, setSnapshot] = useState<CalculationSnapshot | null>(null);
  const result = snapshot?.result ?? null;
  const [errors, setErrors] = useState<string[]>([]);
  const [stale, setStale] = useState(false);
  const [features, setFeatures] = useState<CeilingFeature[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [featureFormKey, setFeatureFormKey] = useState(0);

  const width = Number(inputs.widthMm);
  const length = Number(inputs.lengthMm);

  const hasValidDimensions =
    inputs.widthMm.trim() !== "" &&
    inputs.lengthMm.trim() !== "" &&
    Number.isFinite(width) &&
    Number.isFinite(length) &&
    width > 0 &&
    length > 0;

  const calculatedArea = hasValidDimensions
    ? (width / 1000) * (length / 1000)
    : null;

  const areaM2 =
    calculatedArea !== null &&
    Number.isFinite(calculatedArea) &&
    calculatedArea > 0
      ? calculatedArea
      : null;

  function handleInputChange(field: keyof SiteInput, value: string) {
    setInputs((previous) => ({
      ...previous,
      [field]: value,
    }));

    setDirty(true);
    setErrors([]);

    if (result) {
      setStale(true);
    }
  }

  function handleMaterialChange(field: keyof MaterialInput, value: string) {
    setMaterialInputs((previous) => ({
      ...previous,
      [field]: value,
    }));

    setDirty(true);
    setErrors([]);

    if (result) {
      setStale(true);
    }
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

      moveAfterCalculation("inputs");
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
        calculationRuleVersion: "area-manual-adjustment-v1",

        ...calculationInput,
        result: nextResult,
      };

      setSnapshot(nextSnapshot);
      setErrors([]);
      setStale(false);

      moveAfterCalculation("results");
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "계산 중 오류가 발생했습니다.",
      ]);

      // 실패한 계산으로 이전 Snapshot을 덮어쓰지 않습니다.
      if (snapshot) {
        setStale(true);
      }

      moveAfterCalculation("inputs");
    }
  }

  function handleLoadProject(project: Project) {
    setInputs({ ...project.siteInput });
    setMaterialInputs({ ...project.materialInput });
    setFeatures((project.features ?? []).map((feature) => ({ ...feature })));
    setAdjustments(
      (project.adjustments ?? []).map((adjustment) => ({
        ...adjustment,
      })),
    );
    setFeatureFormKey((previous) => previous + 1);

    setSnapshot(null);
    setErrors([]);
    setStale(false);
    setDirty(false);
  }

  function handleNewProject() {
    setInputs({
      name: "",
      widthMm: "",
      lengthMm: "",
    });

    setMaterialInputs({
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
    });

    setFeatureFormKey((previous) => previous + 1);

    setSnapshot(null);
    setErrors([]);
    setStale(false);
    setDirty(false);
    setFeatures([]);
    setAdjustments([]);
  }

  function markCalculationChanged() {
    setDirty(true);
    setErrors([]);

    if (result) {
      setStale(true);
    }
  }

  function handleAddFeature(feature: CeilingFeature) {
    setFeatures((previous) => [...previous, feature]);
    markCalculationChanged();
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

    setFeatures((previous) => previous.filter((feature) => feature.id !== id));

    setAdjustments((previous) =>
      previous.filter((adjustment) => adjustment.featureId !== id),
    );

    markCalculationChanged();
  }

  function handleAddAdjustment(adjustment: Adjustment) {
    setAdjustments((previous) => [...previous, adjustment]);
    markCalculationChanged();
  }

  function handleDeleteAdjustment(id: string) {
    setAdjustments((previous) =>
      previous.filter((adjustment) => adjustment.id !== id),
    );

    markCalculationChanged();
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
      <Sidebar activeMenu={activeMenu} onNavigate={handleNavigate} />
      <ProjectHeader projectName={inputs.name} areaM2={areaM2}>
        <ProjectManager
          ref={projectManagerRef}
          siteInput={inputs}
          materialInput={materialInputs}
          features={features}
          adjustments={adjustments}
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

      <main className="p-4 pb-28 sm:p-6 sm:pb-28 min-[1280px]:pb-6">
        <div className="grid grid-cols-1 items-start gap-4 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)]">
          <div id="inputs" className="min-w-0 space-y-4">
            <InputPanel inputs={inputs} onChange={handleInputChange} />

            <MaterialInputPanel
              inputs={materialInputs}
              onChange={handleMaterialChange}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              {errors.length > 0 && (
                <div
                  id="calculation-errors"
                  role="alert"
                  className="mb-4 rounded-lg bg-red-50 p-3"
                >
                  <p className="text-sm font-semibold text-red-800">
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
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
                  widthMm={inputs.widthMm}
                  lengthMm={inputs.lengthMm}
                  features={features}
                  onAdd={handleAddFeature}
                  onDelete={handleDeleteFeature}
                />
              </div>
            </details>

            <AdjustmentInputPanel
              key={`adjustments-${featureFormKey}`}
              features={features}
              adjustments={adjustments}
              onAdd={handleAddAdjustment}
              onDelete={handleDeleteAdjustment}
            />
          </div>

          <div id="preview" className="min-w-0">
            <CeilingPreview
              widthMm={inputs.widthMm}
              lengthMm={inputs.lengthMm}
              features={features}
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
