"use client";

import { useState } from "react";
import ProjectHeader from "@/components/layout/ProjectHeader";
import InputPanel from "./InputPanel";
import CeilingPreview from "./CeilingPreview";
import type { MaterialInput, SiteInput } from "@/types/ceilplan";
import MaterialInputPanel from "./MaterialInputPanel";

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

  function handleMaterialChange(field: keyof MaterialInput, value: string) {
    setMaterialInputs((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleInputChange(field: keyof SiteInput, value: string) {
    setInputs((previous) => ({
      ...previous,
      [field]: value,
    }));
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
          </div>

          <CeilingPreview widthMm={inputs.widthMm} lengthMm={inputs.lengthMm} />

          <section
            id="results"
            aria-labelledby="results-title"
            className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 id="results-title" className="text-lg font-bold">
              예상 자재 산출 결과
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              계산 기능을 연결한 뒤 결과를 표시합니다.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
