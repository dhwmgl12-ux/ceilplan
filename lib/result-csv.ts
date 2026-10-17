import type { CalculationSnapshot } from "../types/ceilplan";

type Cell = string | number | null;

export function escapeCell(value: Cell): string {
  let content = value === null ? "미입력" : String(value);

  // 사용자 문자열이 스프레드시트 수식으로 실행되지 않도록 처리합니다.
  // 숫자 타입의 음수는 그대로 유지합니다.
  if (
    typeof value === "string" &&
    (/^\s*[=+\-@]/.test(content) || /^[\t\r\n]/.test(content))
  ) {
    content = `'${content}`;
  }

  return `"${content.replaceAll('"', '""')}"`;
}

export function snapshotToCsv(snapshot: CalculationSnapshot): string {
  const headers: Cell[] = [
    "현장명",
    "계산 시각",
    "계산 정책 버전",
    "자재명",
    "이론 수량",
    "물량 단위",
    "현장 추가",
    "현장 공제",
    "현장 순증감",
    "조정 후 이론 물량",
    "Loss (%)",
    "Loss 증가량",
    "Loss 적용 후",
    "발주 올림 증가량",
    "최종 발주 수량",
    "구매 단위",
    "주문 총수량",
    "단가",
    "예상 금액",
    "비고",
  ];

  const rows: Cell[][] = snapshot.result.materials.map((material) => {
    const summary = material.featureAdjustment;

    return [
      snapshot.siteInput.name,
      snapshot.calculatedAt,
      snapshot.calculationRuleVersion,
      material.name,
      material.theoreticalQuantity,
      material.quantityUnit,
      summary ? summary.addedQuantity : "미지원",
      summary ? summary.deductedQuantity : "미지원",
      summary ? summary.netQuantity : "미지원",
      material.quantityBeforeLoss,
      material.lossRate,
      material.lossAmount,
      material.quantityAfterLoss,
      material.roundingSurplus,
      material.orderQuantity,
      material.purchaseUnit,
      material.orderedQuantity,
      material.unitPrice,
      material.estimatedCost,
      "면적 기반 예상값 · 사용자 입력 조정 · VAT 별도",
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
}
