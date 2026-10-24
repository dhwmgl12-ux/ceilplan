import type { HousingReport } from "../types/housing-project";
import { escapeCell } from "./result-csv.ts";

export function housingReportToCsv(report: HousingReport): string {
  const headers: (string | number | null)[] = [
    "프로젝트명",
    "계산 시각",
    "계산 정책",
    "세대 타입",
    "세대 수",
    "공간명",
    "자재명",
    "보드 가로(mm)",
    "보드 세로(mm)",
    "겹수",
    "금속 간격(mm)",
    "금속 정척(mm)",
    "물량 단위",
    "기본 물량(공간당)",
    "현장 추가(공간당)",
    "현장 공제(공간당)",
    "조정 후 물량(공간당)",
    "Loss(%)",
    "Loss 증가량(공간당)",
    "Loss 적용 후(공간당)",
    "올림 증가량(공간당)",
    "발주 수량(공간당)",
    "구매 단위",
    "전체 세대 발주 수량",
    "전체 세대 주문 물량",
    "단가",
    "금액(공간당)",
    "금액(전체 세대)",
    "비고",
  ];

  const rows: (string | number | null)[][] = [];

  for (const type of report.result.unitTypes) {
    const sourceType = report.project.unitTypes.find(
      (item) => item.id === type.unitTypeId,
    );

    if (!sourceType) {
      throw new Error("계산 당시 세대 타입을 찾을 수 없습니다.");
    }

    for (const space of type.spaces) {
      const sourceSpace = sourceType.spaces.find(
        (item) => item.id === space.spaceId,
      );

      if (!sourceSpace) {
        throw new Error("계산 당시 공간을 찾을 수 없습니다.");
      }

      const input = sourceSpace.materialInput;

      for (const repeated of space.repeatedMaterials) {
        const material = repeated.material;
        const summary = material.featureAdjustment;
        const isBoard = material.id === "BOARD";
        const isMbar = material.id === "MBAR";

        rows.push([
          report.project.name,
          report.calculatedAt,
          report.calculationRuleVersion,
          type.unitTypeName,
          type.unitCount,
          space.spaceName,
          material.name,

          isBoard ? input.boardWidthMm : "",
          isBoard ? input.boardLengthMm : "",
          isBoard ? input.layerCount : "",

          isBoard ? "" : isMbar ? input.mbarSpacingMm : input.carryingSpacingMm,

          isBoard
            ? ""
            : isMbar
              ? input.mbarStockLengthMm
              : input.carryingStockLengthMm,

          material.quantityUnit,
          material.theoreticalQuantity,
          summary ? summary.addedQuantity : "미지원",
          summary ? summary.deductedQuantity : "미지원",
          material.quantityBeforeLoss,
          material.lossRate,
          material.lossAmount,
          material.quantityAfterLoss,
          material.roundingSurplus,
          material.orderQuantity,
          material.purchaseUnit,
          repeated.totalOrderQuantity,
          repeated.totalOrderedQuantity,
          material.unitPrice,
          material.estimatedCost,
          repeated.totalEstimatedCost,
          "공간별 올림 후 세대 수 적용 · VAT 별도",
        ]);
      }
    }
  }

  return [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
}
