"use client";

import { useState } from "react";
import type { CalculationSnapshot } from "@/types/ceilplan";
import ToolSection from "@/components/ui/ToolSection";
import CalculationBreakdown from "./CalculationBreakdown";
import OrderPrintButton from "./OrderPrintButton";
import { snapshotToCsv } from "@/lib/result-csv";
import { downloadText } from "@/lib/download";

interface ResultsPanelProps {
  snapshot: CalculationSnapshot | null;
  stale: boolean;
}

function formatQuantity(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  });
}

function formatMoney(value: number | null) {
  if (value === null) return "단가 미입력";

  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}원`;
}

const calculationSteps = [
  {
    title: "기본 물량·현장 조정",
    description: "면적 기반 이론 물량에 사용자 입력 추가·공제를 반영합니다.",
  },
  {
    title: "Loss 적용",
    description: "조정 후 물량에 입력한 Loss를 적용합니다.",
  },
  {
    title: "구매 단위 올림",
    description: "석고보드는 장, 금속 자재는 구매 정척의 본 단위로 올림합니다.",
  },
  {
    title: "예상 금액",
    description: "최종 발주 수량에 해당 구매 단위의 사용자 단가를 곱합니다.",
  },
];

const formulas = [
  {
    title: "공간 면적",
    description:
      "직사각형은 가로 × 세로, ㄱ자·ㄷ자는 제외 영역을 반영한 천장 면적입니다.",
  },
  {
    title: "석고보드 이론 장수",
    description: "공간 면적(㎡) ÷ 보드 1장 면적(㎡) × 겹수",
  },
  {
    title: "M-BAR·캐링 이론 총길이",
    description: "공간 면적(㎡) ÷ 입력 간격(m)",
  },
  {
    title: "조정 후 물량",
    description: "기본 이론 물량 + 현장 추가 − 현장 공제",
  },
  {
    title: "Loss 적용 수량",
    description: "조정 후 물량 × (1 + Loss 비율 ÷ 100)",
  },
  {
    title: "석고보드 발주 수량",
    description: "Loss 적용 장수를 장 단위로 올림",
  },
  {
    title: "금속 발주 수량",
    description: "Loss 적용 길이(m) ÷ 정척 길이(m)의 결과를 본 단위로 올림",
  },
  {
    title: "발주 올림 증가량",
    description:
      "주문 총수량 − Loss 적용 수량. 금속 주문 총길이는 발주 본수 × 정척 길이입니다.",
  },
  {
    title: "예상 금액",
    description: "발주 장수·본수 × 해당 구매 단위의 단가",
  },
];

export default function ResultsPanel({ snapshot, stale }: ResultsPanelProps) {
  const [exportError, setExportError] = useState("");

  function handleDownloadCsv() {
    if (!snapshot || stale) return;

    setExportError("");

    try {
      downloadText(
        `ceilplan-result-${Date.now()}.csv`,
        "\uFEFF" + snapshotToCsv(snapshot),
        "text/csv;charset=utf-8",
      );
    } catch (caught) {
      setExportError(
        caught instanceof Error
          ? caught.message
          : "CSV 파일을 생성하지 못했습니다.",
      );
    }
  }

  if (!snapshot) {
    return (
      <section id="results" aria-labelledby="results-title" className="cp-card">
        <h2 id="results-title" className="cp-title">
          산출 결과
        </h2>

        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
          <p className="text-sm font-medium text-slate-700">
            아직 계산 결과가 없습니다
          </p>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            공간 치수와 계산 조건을 입력한 뒤 계산하세요. 예상 발주 수량과 금액,
            계산 근거를 확인할 수 있습니다.
          </p>
        </div>
      </section>
    );
  }

  const result = snapshot.result;

  const missingPrices = result.materials
    .filter((material) => material.unitPrice === null)
    .map((material) => material.name);

  return (
    <section
      id="results"
      aria-labelledby="results-title"
      className="min-w-0 space-y-3"
    >
      <div className="cp-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="results-title" className="cp-title">
            산출 결과
          </h2>

          <span
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
              stale
                ? "bg-amber-50 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {stale ? "이전 결과" : "계산 완료"}
          </span>
        </div>

        <p className="mt-2 break-words text-xs text-slate-600">
          {snapshot.siteInput.name}
          {" · "}
          {formatQuantity(result.areaM2)} ㎡
        </p>

        <p className="mt-1 text-[11px] text-slate-500">
          {new Date(snapshot.calculatedAt).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          })}
          {" 계산"}
        </p>

        {stale && (
          <p
            id="result-stale-notice"
            role="status"
            className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
          >
            입력이 변경됐거나 복원한 결과입니다. 아래 수량·금액·근거는 이전 계산
            당시 값입니다. 다시 계산해야 CSV와 인쇄를 사용할 수 있습니다.
          </p>
        )}

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-600">합계 예상 자재비</p>

          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {result.totalEstimatedCost === null
              ? "금액 미완성"
              : formatMoney(result.totalEstimatedCost)}
          </p>

          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            {missingPrices.length > 0
              ? `${missingPrices.join(" · ")} 단가를 입력하세요.`
              : "자재비 기준 · VAT, 운송비, 인건비 제외"}
          </p>
        </div>

        <h3 className="mt-5 text-xs font-semibold text-slate-700">
          최종 발주 수량
        </h3>

        <ul className="mt-2 divide-y divide-slate-100">
          {result.materials.map((material) => (
            <li
              key={material.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">
                  {material.name}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {formatMoney(material.estimatedCost)}
                </p>
              </div>

              <div className="min-w-0 text-right">
                <p className="break-words text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatQuantity(material.orderQuantity)}
                  <span className="ml-1 text-xs font-medium text-slate-500">
                    {material.purchaseUnit}
                  </span>
                </p>

                {material.quantityUnit === "m" && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    총 {formatQuantity(material.orderedQuantity)} m
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={stale}
            aria-describedby={stale ? "result-stale-notice" : undefined}
            className="cp-button-secondary"
          >
            CSV 다운로드
          </button>

          <OrderPrintButton snapshot={snapshot} stale={stale} />
        </div>

        {exportError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {exportError}
          </p>
        )}
      </div>

      <ToolSection
        title="상세 산출 내역"
        description="기본 물량·현장 증감·Loss·최종 발주를 확인합니다."
        status={`${result.materials.length}개 자재`}
      >
        <div
          role="region"
          aria-label="상세 자재 산출 표"
          tabIndex={0}
          className="overflow-x-auto rounded-md border border-slate-200"
        >
          <table className="w-full min-w-[440px] text-left text-xs">
            <caption className="sr-only">
              자재별 기본 물량, 현장 순증감, Loss와 최종 발주 수량
            </caption>

            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-2 py-3">
                  자재
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  기본
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  현장 증감
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  Loss
                </th>
                <th scope="col" className="px-2 py-3 text-right">
                  발주
                </th>
              </tr>
            </thead>

            <tbody>
              {result.materials.map((material) => {
                const adjustment = material.featureAdjustment;

                return (
                  <tr key={material.id} className="border-t border-slate-100">
                    <th scope="row" className="px-2 py-3 font-medium">
                      {material.name}
                    </th>

                    <td className="px-2 py-3 text-right tabular-nums">
                      {formatQuantity(material.theoreticalQuantity)}{" "}
                      {material.quantityUnit}
                    </td>

                    <td className="px-2 py-3 text-right tabular-nums">
                      {adjustment
                        ? `${adjustment.netQuantity > 0 ? "+" : ""}${formatQuantity(
                            adjustment.netQuantity,
                          )} ${adjustment.quantityUnit}`
                        : "미지원"}
                    </td>

                    <td className="px-2 py-3 text-right tabular-nums">
                      {formatQuantity(material.lossRate)}%
                    </td>

                    <td className="px-2 py-3 text-right font-semibold tabular-nums">
                      {formatQuantity(material.orderQuantity)}{" "}
                      {material.purchaseUnit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          현장 증감은 Loss 전에 반영합니다. 금속의 기본 물량·증감은 m, 최종
          발주는 본 단위입니다. 상세 숫자는 자재별 계산 근거에서 확인하세요.
        </p>
      </ToolSection>

      <ToolSection
        title="자재별 계산 근거"
        description="계산 당시 입력값과 추가·공제·올림 과정을 추적합니다."
      >
        <div className="space-y-3">
          {result.materials.map((material) => (
            <CalculationBreakdown
              key={material.id}
              snapshot={snapshot}
              material={material}
            />
          ))}
        </div>
      </ToolSection>

      <ToolSection
        title="금액 계산 내역"
        description="구매 단위별 발주 수량과 단가를 확인합니다."
      >
        <dl className="space-y-4">
          {result.materials.map((material) => (
            <div key={material.id}>
              <dt className="text-xs font-semibold text-slate-700">
                {material.name}
              </dt>

              <dd className="mt-1 text-xs leading-5 text-slate-500">
                {material.unitPrice === null
                  ? "단가 미입력"
                  : `${formatQuantity(material.orderQuantity)} ${
                      material.purchaseUnit
                    } × ${formatMoney(material.unitPrice)} / ${
                      material.purchaseUnit
                    }`}
              </dd>

              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {formatMoney(material.estimatedCost)}
              </dd>
            </div>
          ))}
        </dl>
      </ToolSection>

      <ToolSection
        title="계산 방식·결과 정보"
        description="적용 순서·공식·계산 정책 버전과 한계를 확인합니다."
      >
        <p className="break-words text-[11px] text-slate-500">
          계산 정책: {snapshot.calculationRuleVersion}
        </p>

        <ol className="mt-4 space-y-3">
          {calculationSteps.map((step, index) => (
            <li key={step.title}>
              <p className="text-xs font-semibold text-slate-700">
                {index + 1}. {step.title}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <details className="mt-4 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            자세한 계산 공식
          </summary>

          <dl className="mt-3 space-y-3">
            {formulas.map((formula) => (
              <div key={formula.title}>
                <dt className="text-xs font-semibold text-slate-700">
                  {formula.title}
                </dt>
                <dd className="mt-1 text-xs leading-5 text-slate-500">
                  {formula.description}
                </dd>
              </div>
            ))}
          </dl>
        </details>

        <p className="mt-4 rounded-md bg-slate-50 p-3 text-[11px] leading-6 text-slate-500">
          면적 기반 예상값이며 사용자 입력 조정값을 반영합니다. 현장 요소별 자동
          공제·보강, 실제 골조 배치, 절단·잔재 최적화 및 구조 안전 판단은
          포함하지 않습니다.
        </p>
      </ToolSection>
    </section>
  );
}
