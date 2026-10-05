"use client";

import { useState } from "react";
import type { SiteInput } from "@/types/ceilplan";
import ProjectHeader from "@/components/layout/ProjectHeader";
import InputPanel from "./InputPanel";

export default function CeilingWorkspace() {
  const [inputs, setInputs] = useState<SiteInput>({
    name: "",
    widthMm: "",
    lengthMm: "",
  });

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
          <InputPanel inputs={inputs} onChange={handleInputChange} />

          <section
            aria-labelledby="preview-title"
            className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 id="preview-title" className="text-lg font-bold">
              천장 미리보기
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              다음 단계에서 입력한 치수를 SVG에 연결합니다.
            </p>
          </section>

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
