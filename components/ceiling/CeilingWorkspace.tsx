"use client";

import { useState } from "react";
import type {
  CalculationResult,
  MaterialInput,
  SiteInput,
} from "@/types/ceilplan";
import { calculateBase, validateInputs } from "@/lib/calculations/base";
import ProjectHeader from "@/components/layout/ProjectHeader";
import InputPanel from "./InputPanel";
import MaterialInputPanel from "./MaterialInputPanel";
import CeilingPreview from "./CeilingPreview";
import ResultsPanel from "./ResultsPanel";

export default function CeilingWorkspace() {
  const [inputs, setInputs] = useState<SiteInput>({
    name: "",
    widthMm: "",
    lengthMm: "",
  });

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

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [stale, setStale] = useState(false);

  function handleInputChange(field: keyof SiteInput, value: string) {
    setInputs((previous) => ({
      ...previous,
      [field]: value,
    }));

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

    setErrors([]);

    if (result) {
      setStale(true);
    }
  }

  function handleCalculate() {
    const validationErrors = validateInputs(inputs, materialInputs);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const nextResult = calculateBase(inputs, materialInputs);

      setResult(nextResult);
      setErrors([]);
      setStale(false);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "계산 중 오류가 발생했습니다.",
      ]);
    }
  }

  return (
    <div className="min-w-0">
      <ProjectHeader projectName={inputs.name} />

      <main className="p-4 sm:p-6">
        <div className="grid grid-cols-1 items-start gap-4 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)]">
          <div className="min-w-0 space-y-4">
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
          </div>

          <CeilingPreview widthMm={inputs.widthMm} lengthMm={inputs.lengthMm} />

          <ResultsPanel result={result} stale={stale} />
        </div>
      </main>
    </div>
  );
}
