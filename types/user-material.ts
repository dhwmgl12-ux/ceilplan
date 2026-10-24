import type { MaterialId } from "./ceilplan";

// 입력 중 공란 등을 보존하기 위해 숫자 입력도 문자열로 관리합니다.
export interface ExtraMaterialInput {
  id: string;
  name: string;

  quantity: string;
  unit: string;
  unitPrice: string;
  memo: string;
}

// 계산 당시 값입니다.
export interface ExtraMaterialCalculation {
  id: string;
  name: string;

  quantity: number;
  unit: string;
  unitPrice: number | null;
  estimatedCost: number | null;
  memo: string;

  sourceType: "USER_INPUT";
  status: "INPUT_BASED";
}

export interface ExtraMaterialsResult {
  items: ExtraMaterialCalculation[];
  totalEstimatedCost: number | null;
}

// 자동 계산 자재의 단가는 기존 구매 단위와 일치시킵니다.
interface BasePriceEntry {
  id: string;
  name: string;
  unitPrice: string;
  memo: string;
}

export type UserPriceEntry =
  | (BasePriceEntry & {
      target: "BOARD";
      unit: "장";
    })
  | (BasePriceEntry & {
      target: "MBAR" | "CARRYING";
      unit: "본";
    })
  | (BasePriceEntry & {
      target: "EXTRA";
      unit: string;
    });

export type StandardPriceTarget = MaterialId;
