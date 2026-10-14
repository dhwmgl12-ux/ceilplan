import type { Project } from "../types/ceilplan";

export function createExampleProject(id: string, updatedAt: string): Project {
  return {
    id,
    updatedAt,

    siteInput: {
      name: "[예시] 천장 자재 산출 체험",
      widthMm: "4000",
      lengthMm: "3000",
    },

    materialInput: {
      mbarSpacingMm: "1000",
      carryingSpacingMm: "1000",

      boardWidthMm: "1000",
      boardLengthMm: "1000",
      layerCount: "1",

      boardLossPercent: "0",
      metalLossPercent: "0",

      mbarStockLengthMm: "4000",
      carryingStockLengthMm: "4000",

      boardUnitPrice: "100",
      mbarUnitPrice: "200",
      carryingUnitPrice: "300",
    },

    features: [
      {
        id: "example-light-box",
        type: "LIGHT_BOX",
        xMm: 500,
        yMm: 500,
        widthMm: 1500,
        lengthMm: 500,
      },
      {
        id: "example-hatch",
        type: "INSPECTION_HATCH",
        xMm: 2500,
        yMm: 1500,
        widthMm: 500,
        lengthMm: 500,
      },
    ],

    adjustments: [
      {
        id: "example-mbar-add",
        featureId: "example-light-box",
        materialId: "MBAR",
        adjustmentType: "ADD",
        quantity: 4,
        unit: "m",
        memo: "검산 체험용 골조 추가 입력",
        sourceType: "USER_INPUT",
        status: "INPUT_BASED",
      },
      {
        id: "example-board-deduct",
        featureId: "example-hatch",
        materialId: "BOARD",
        adjustmentType: "DEDUCT",
        quantity: 1,
        unit: "㎡",
        memo: "검산 체험용 면적 공제 입력. 요소 크기에서 자동 산출한 값이 아닙니다.",
        sourceType: "USER_INPUT",
        status: "INPUT_BASED",
      },
    ],

    snapshot: null,
  };
}
