import {
  featureLabels,
  type CalculationSnapshot,
  type MaterialCalculation,
} from "@/types/ceilplan";

interface CalculationBreakdownProps {
  snapshot: CalculationSnapshot;
  material: MaterialCalculation;
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 6,
  });
}

function formatMoney(value: number | null) {
  return value === null ? "단가 미입력" : `${formatNumber(value)} 원`;
}

export default function CalculationBreakdown({
  snapshot,
  material,
}: CalculationBreakdownProps) {
  const { siteInput, materialInput, result } = snapshot;

  const isBoard = material.id === "BOARD";
  const unit = material.quantityUnit;
  const adjustment = material.featureAdjustment;

  const spacingMm =
    material.id === "MBAR"
      ? materialInput.mbarSpacingMm
      : materialInput.carryingSpacingMm;

  const stockLengthMm =
    material.id === "MBAR"
      ? materialInput.mbarStockLengthMm
      : materialInput.carryingStockLengthMm;

  const rows: { label: string; value: string }[] = [
    {
      label: "전체 외곽 치수",
      value: `${siteInput.widthMm} × ${siteInput.lengthMm} mm`,
    },
    {
      label: "공간 형태",
      value:
        siteInput.shape === "L"
          ? "ㄱ자 · 왼쪽 아래 제외"
          : siteInput.shape === "U"
            ? "ㄷ자 · 오른쪽 중간 제외"
            : "직사각형",
    },
    ...(siteInput.shape === "L" || siteInput.shape === "U"
      ? [
          {
            label: "제외 영역",
            value:
              `${siteInput.cutoutWidthMm} × ` +
              `${siteInput.cutoutLengthMm} mm`,
          },
          ...(siteInput.shape === "U"
            ? [
                {
                  label: "제외 영역 위쪽 거리",
                  value: `${siteInput.cutoutTopMm} mm`,
                },
              ]
            : []),
        ]
      : []),
    {
      label: "천장 전체 면적",
      value: `${formatNumber(result.areaM2)} ㎡`,
    },
    ...(isBoard
      ? [
          {
            label: "석고보드 규격",
            value:
              `${materialInput.boardWidthMm} × ` +
              `${materialInput.boardLengthMm} mm`,
          },
          {
            label: "겹수",
            value: `${materialInput.layerCount}겹`,
          },
        ]
      : [
          {
            label: "부재 간격",
            value: `${spacingMm} mm`,
          },
        ]),
    {
      label: "기본 이론 물량",
      value: `${formatNumber(material.theoreticalQuantity)} ${unit}`,
    },
    {
      label: "현장 추가",
      value: adjustment
        ? `+${formatNumber(adjustment.addedQuantity)} ${unit}`
        : "조정 계산 미지원",
    },
    {
      label: "현장 공제",
      value: adjustment
        ? `−${formatNumber(adjustment.deductedQuantity)} ${unit}`
        : "조정 계산 미지원",
    },
    {
      label: "조정 후 이론 물량",
      value: `${formatNumber(material.quantityBeforeLoss)} ${unit}`,
    },
    {
      label: "Loss",
      value: `${formatNumber(material.lossRate)}%`,
    },
    {
      label: "Loss 증가량",
      value: `+${formatNumber(material.lossAmount)} ${unit}`,
    },
    {
      label: "Loss 적용 후 필요량",
      value: `${formatNumber(material.quantityAfterLoss)} ${unit}`,
    },
    {
      label: "구매 규격",
      value: isBoard ? "1장 단위" : `${stockLengthMm} mm / 본`,
    },
    {
      label: "발주 올림 증가량",
      value: `+${formatNumber(material.roundingSurplus)} ${unit}`,
    },
    {
      label: "최종 발주 수량",
      value: `${formatNumber(material.orderQuantity)} ` + material.purchaseUnit,
    },
    {
      label: isBoard ? "주문 총 장수" : "주문 총길이",
      value: `${formatNumber(material.orderedQuantity)} ${unit}`,
    },
    {
      label: "단가",
      value:
        material.unitPrice === null
          ? "단가 미입력"
          : `${formatMoney(material.unitPrice)} / ${material.purchaseUnit}`,
    },
    {
      label: "예상 금액",
      value: formatMoney(material.estimatedCost),
    },
  ];

  return (
    <details className="rounded-lg border border-slate-200">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-blue-700">
        {material.name} 계산 근거 보기
      </summary>

      <div className="space-y-4 border-t border-slate-100 p-4">
        <p className="text-xs leading-5 text-slate-500">
          계산 당시 입력값과 저장된 결과입니다. 수량은 화면에서 다시 계산하지
          않습니다.
        </p>

        <dl className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 py-2 text-xs leading-5"
            >
              <dt className="text-slate-500">{row.label}</dt>
              <dd className="break-words text-right font-medium text-slate-800 tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="rounded-lg bg-blue-50/50 p-3 text-xs leading-6 text-slate-600">
          <p className="font-semibold text-slate-800">적용 순서</p>
          <p>
            기본 물량 + 현장 추가 − 현장 공제 → Loss → 구매 단위 환산·올림 →
            단가 적용
          </p>

          <p className="mt-2">
            {isBoard
              ? "기본 장수 = 전체 면적 ÷ 보드 1장 면적 × 겹수"
              : "기본 연장 = 전체 면적 ÷ 간격(m)"}
          </p>

          <p>
            {isBoard
              ? "면적 조정도 보드 1장 면적으로 나눈 뒤 겹수를 적용합니다."
              : "현장 조정값은 입력한 연장(m)을 적용합니다."}
          </p>

          <p>
            {isBoard
              ? "발주 장수 = Loss 적용 후 장수 올림"
              : "발주 본수 = Loss 적용 후 연장 ÷ 정척 길이(m)의 결과 올림"}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">반영된 현장 조정값</h4>

          {!adjustment || adjustment.items.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              {!adjustment
                ? "현장 조정 계산을 지원하지 않는 결과입니다."
                : "반영된 현장 조정값이 없습니다."}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {adjustment.items.map((item) => {
                const original = item.adjustment;

                const featureIndex = snapshot.features.findIndex(
                  (feature) => feature.id === original.featureId,
                );

                const featureName =
                  featureIndex >= 0
                    ? `${featureIndex + 1}번 ${featureLabels[item.featureType]}`
                    : featureLabels[item.featureType];

                const direction =
                  original.adjustmentType === "ADD" ? "추가" : "공제";

                return (
                  <li
                    key={original.id}
                    className="rounded-lg bg-slate-50 p-3 text-xs leading-5"
                  >
                    <p className="font-semibold">
                      {featureName} · {direction}
                    </p>

                    <p className="mt-1">
                      입력: {formatNumber(original.quantity)} {original.unit}
                    </p>

                    <p>
                      반영: {formatNumber(item.convertedQuantity)}{" "}
                      {item.quantityUnit}
                    </p>

                    <p className="mt-1 break-words text-slate-600">
                      사유: {original.memo}
                    </p>

                    <p className="mt-1 text-slate-500">근거: 사용자 입력</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-xs leading-5 text-slate-400">
          수량은 최대 소수 여섯 자리로 표시합니다. 표시값을 다시 계산에 사용하지
          않습니다.
        </p>
      </div>
    </details>
  );
}
