import type { CalculationSnapshot } from "@/types/ceilplan";
import CalculationBreakdown from "./CalculationBreakdown";

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
  })} 원`;
}

export default function ResultsPanel({ snapshot, stale }: ResultsPanelProps) {
  const result = snapshot?.result ?? null;

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

            {snapshot && (
              <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                <p className="break-words">
                  계산 당시 현장: {snapshot.siteInput.name}
                </p>

                <p>
                  계산 시각:{" "}
                  {new Date(snapshot.calculatedAt).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>

                <p className="break-words">
                  계산 정책: {snapshot.calculationRuleVersion}
                </p>

                <p>
                  현재 입력 폼과 미리보기는 수정 중인 값이며, 아래 결과와 근거는
                  계산 당시 값입니다.
                </p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1600px]:grid-cols-4">
              {result.materials.map((material) => (
                <div
                  key={material.id}
                  className="min-w-0 rounded-lg border border-blue-100 bg-blue-50/50 p-3"
                >
                  <h3 className="text-sm font-semibold text-slate-700">
                    {material.name}
                  </h3>

                  <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {formatQuantity(material.orderQuantity)}{" "}
                    <span className="text-sm font-medium">
                      {material.purchaseUnit}
                    </span>
                  </p>

                  {material.quantityUnit === "m" && (
                    <p className="mt-1 text-xs text-slate-500">
                      총 {formatQuantity(material.orderedQuantity)} m
                    </p>
                  )}

                  <p className="mt-2 break-words text-xs text-slate-600">
                    {formatMoney(material.estimatedCost)}
                  </p>
                </div>
              ))}

              <div className="min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <h3 className="mt-3 break-words text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                  합계 예상 금액
                </h3>

                <p className="mt-3 break-words text-xl font-bold text-emerald-700">
                  {result.totalEstimatedCost === null
                    ? "단가 입력 필요"
                    : formatMoney(result.totalEstimatedCost)}
                </p>

                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  {result.totalEstimatedCost === null
                    ? "모든 자재의 단가를 입력하세요."
                    : "자재비 기준 · VAT 별도"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {result && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold">상세 자재 산출 내역</h3>

            <div
              role="region"
              aria-label="자재 산출 표"
              tabIndex={0}
              className="mt-4 overflow-x-auto rounded-lg border border-slate-200"
            >
              <table className="w-full text-left text-xs">
                <caption className="sr-only">
                  자재별 기본 수량, Loss 비율 및 최종 발주 수량
                </caption>

                <thead className="bg-blue-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-2 py-3">
                      자재
                    </th>
                    <th scope="col" className="px-2 py-3 text-right">
                      기본 수량
                    </th>
                    <th scope="col" className="px-2 py-3 text-right">
                      Loss
                    </th>
                    <th scope="col" className="px-2 py-3 text-right">
                      최종 발주
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {result.materials.map((material) => (
                    <tr key={material.id} className="border-t border-slate-200">
                      <th scope="row" className="px-2 py-3 font-medium">
                        {material.name}
                      </th>

                      <td className="px-2 py-3 text-right tabular-nums">
                        {formatQuantity(material.theoreticalQuantity)}{" "}
                        {material.quantityUnit}
                      </td>

                      <td className="px-2 py-3 text-right tabular-nums">
                        {formatQuantity(material.lossRate)}%
                      </td>

                      <td className="px-2 py-3 text-right font-semibold text-blue-700 tabular-nums">
                        {formatQuantity(material.orderQuantity)}{" "}
                        {material.purchaseUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {snapshot && (
              <div className="mt-4 space-y-3">
                {snapshot.result.materials.map((material) => (
                  <CalculationBreakdown
                    key={material.id}
                    snapshot={snapshot}
                    material={material}
                  />
                ))}
              </div>
            )}

            <p className="mt-3 text-xs leading-5 text-slate-500">
              사용자 입력 현장 조정값을 Loss 적용 전에 반영합니다. 금속 자재의
              기본 물량과 증감은 m, 최종 발주는 본수입니다. 요소 크기를 이용한
              자동 공제·보강은 지원하지 않습니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold">자재별 금액 계산 내역</h3>

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
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-bold">계산 근거 및 산출 기준</h3>

        <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              title: "기본 물량과 현장 조정",
              description:
                "면적 기반 이론 물량에 사용자가 입력한 현장 추가·공제를 반영합니다.",
            },
            {
              title: "Loss 적용",
              description:
                "입력한 석고·금속 Loss를 적용하고 증가량을 별도로 표시합니다.",
            },
            {
              title: "구매 단위",
              description:
                "석고는 장 단위, 금속은 입력한 정척 길이의 본 단위로 올림합니다.",
            },
            {
              title: "예상 금액",
              description:
                "최종 발주 수량에 해당 구매 단위의 사용자 단가를 적용합니다.",
            },
          ].map((step, index) => (
            <li key={step.title}>
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700"
                >
                  {index + 1}
                </span>

                {step.title}
              </h4>

              <p className="mt-2 text-xs leading-6 text-slate-500">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <details className="mt-4 rounded-lg border border-slate-200">
          <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-blue-700">
            자세한 계산 공식 보기
          </summary>

          <dl className="space-y-4 border-t border-slate-100 p-3 text-xs leading-6">
            <div>
              <dt className="font-semibold">공간 면적</dt>
              <dd className="text-slate-600">
                가로(mm) × 세로(mm) ÷ 1,000,000
              </dd>
            </div>

            <div>
              <dt className="font-semibold">석고보드 이론 장수</dt>
              <dd className="text-slate-600">
                공간 면적(㎡) ÷ 보드 1장 면적(㎡) × 겹수
              </dd>
            </div>

            <div>
              <dt className="font-semibold">M-BAR·캐링 이론 총길이</dt>
              <dd className="text-slate-600">공간 면적(㎡) ÷ 입력 간격(m)</dd>
            </div>

            <div>
              <dt className="font-semibold">Loss 적용 수량</dt>
              <dd className="text-slate-600">
                조정 후 이론 물량 × (1 + Loss 비율 ÷ 100)
              </dd>
            </div>

            <div>
              <dt className="font-semibold">발주 수량</dt>
              <dd className="text-slate-600">
                석고: Loss 적용 장수 올림
                <br />
                금속: Loss 적용 길이(m) ÷ 정척 길이(m)의 결과 올림
              </dd>
            </div>

            <div>
              <dt className="font-semibold">발주 올림 증가량</dt>
              <dd className="text-slate-600">
                주문 총수량 − Loss 적용 수량
                <br />
                금속 주문 총길이 = 발주 본수 × 정척 길이
              </dd>
            </div>

            <div>
              <dt className="font-semibold">예상 금액</dt>
              <dd className="text-slate-600">
                발주 장수·본수 × 해당 구매 단위의 단가
              </dd>
            </div>
          </dl>
        </details>

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-500">
          면적 기반 예상값이며 사용자 입력 조정값을 반영합니다. 현장 요소별 자동
          공제·보강, 실제 골조 배치, 절단·잔재 및 구조 안전 판단은 포함하지
          않습니다.
        </p>
      </div>
    </section>
  );
}
