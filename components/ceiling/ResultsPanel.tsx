import type { CalculationResult } from "@/types/ceilplan";

interface ResultsPanelProps {
  result: CalculationResult | null;
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
  })} 원`;
}

export default function ResultsPanel({ result, stale }: ResultsPanelProps) {
  return (
    <section
      id="results"
      aria-labelledby="results-title"
      className="min-w-0 space-y-4"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 id="results-title" className="text-lg font-bold">
          예상 자재 산출 요약
        </h2>

        {!result ? (
          <p className="mt-4 text-sm leading-6 text-slate-500">
            현장 정보와 계산 조건을 입력한 뒤 계산 버튼을 눌러주세요.
          </p>
        ) : (
          <>
            {stale && (
              <p
                role="status"
                className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
              >
                입력값이 변경되었습니다. 아래는 이전 결과이며, 다시 계산해야
                합니다.
              </p>
            )}

            <p className="mt-3 text-sm text-slate-500">
              계산 당시 공간 면적: {formatQuantity(result.areaM2)} ㎡
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {result.materials.map((material) => (
                <div key={material.id} className="rounded-lg bg-blue-50 p-3">
                  <h3 className="text-sm font-semibold">{material.name}</h3>

                  <p className="mt-3 text-xl font-bold text-blue-700">
                    {formatQuantity(material.orderQuantity)}{" "}
                    {material.purchaseUnit}
                  </p>

                  {material.quantityUnit === "m" && (
                    <p className="mt-1 text-xs text-slate-500">
                      총 {formatQuantity(material.orderedQuantity)} m
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-600">
                    {formatMoney(material.estimatedCost)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {result && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold">상세 자재 산출 내역</h3>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-xs">
                <caption className="sr-only">
                  기본 수량, Loss, 발주 올림 및 최종 발주 수량
                </caption>

                <thead className="bg-blue-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-3">자재</th>
                    <th className="px-3 py-3">이론 수량</th>
                    <th className="px-3 py-3">Loss</th>
                    <th className="px-3 py-3">Loss 증가량</th>
                    <th className="px-3 py-3">Loss 적용 후</th>
                    <th className="px-3 py-3">발주 올림분</th>
                    <th className="px-3 py-3">최종 발주</th>
                  </tr>
                </thead>

                <tbody>
                  {result.materials.map((material) => (
                    <tr key={material.id} className="border-t border-slate-200">
                      <th scope="row" className="px-3 py-3 font-medium">
                        {material.name}
                      </th>

                      <td className="px-3 py-3">
                        {formatQuantity(material.theoreticalQuantity)}{" "}
                        {material.quantityUnit}
                      </td>

                      <td className="px-3 py-3">
                        {formatQuantity(material.lossRate)}%
                      </td>

                      <td className="px-3 py-3">
                        +{formatQuantity(material.lossAmount)}{" "}
                        {material.quantityUnit}
                      </td>

                      <td className="px-3 py-3">
                        {formatQuantity(material.quantityAfterLoss)}{" "}
                        {material.quantityUnit}
                      </td>

                      <td className="px-3 py-3">
                        +{formatQuantity(material.roundingSurplus)}{" "}
                        {material.quantityUnit}
                      </td>

                      <td className="px-3 py-3 font-semibold text-blue-700">
                        {formatQuantity(material.orderQuantity)}{" "}
                        {material.purchaseUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              현장 요소의 추가·공제·보강은 아직 반영하지 않습니다. 금속 자재의
              Loss와 올림분은 길이(m), 최종 발주는 본수로 표시합니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold">예상 발주 금액</h3>

            <p className="mt-1 text-xs text-slate-500">
              자재비 기준 · VAT, 운송비, 인건비 제외
            </p>

            <dl className="mt-4 space-y-4">
              {result.materials.map((material) => (
                <div
                  key={material.id}
                  className="flex flex-wrap items-start justify-between gap-2"
                >
                  <div>
                    <dt className="text-sm font-medium">{material.name}</dt>

                    <dd className="mt-1 text-xs text-slate-500">
                      {material.unitPrice === null
                        ? "단가 미입력"
                        : `${formatQuantity(material.orderQuantity)} ${
                            material.purchaseUnit
                          } × ${formatMoney(material.unitPrice)} / ${
                            material.purchaseUnit
                          }`}
                    </dd>
                  </div>

                  <dd className="text-sm font-semibold">
                    {formatMoney(material.estimatedCost)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 rounded-lg bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                합계 예상 금액
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {result.totalEstimatedCost === null
                  ? "단가 입력 필요"
                  : formatMoney(result.totalEstimatedCost)}
              </p>

              {result.totalEstimatedCost === null && (
                <p className="mt-2 text-xs text-emerald-800">
                  모든 자재의 단가를 입력해야 합계를 계산할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-bold">계산 근거</h3>

        <ol className="mt-4 space-y-3 text-xs leading-6 text-slate-600">
          <li>1. 공간 면적: 가로(mm) × 세로(mm) ÷ 1,000,000</li>
          <li>2. 석고보드: 공간 면적 ÷ 보드 1장 면적 × 겹수</li>
          <li>3. M-BAR·캐링: 공간 면적 ÷ 입력 간격(m)</li>
          <li>4. Loss: 이론 수량 × (1 + 입력 Loss ÷ 100)</li>
          <li>
            5. 석고보드는 장수 올림, 금속 자재는 정척 길이로 나눈 본수를 올림
          </li>
          <li>6. 예상 금액: 발주 장수·본수 × 해당 구매 단위의 단가</li>
        </ol>

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-500">
          면적 기반 예상값입니다. 실제 골조 배치, 절단·잔재, 현장 요소 보강 및
          구조 안전 판단은 포함하지 않습니다.
        </p>
      </div>
    </section>
  );
}
