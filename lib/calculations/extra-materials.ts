import type {
  ExtraMaterialInput,
  ExtraMaterialsResult,
} from "../../types/user-material";

export function validateExtraMaterials(
  inputs: readonly ExtraMaterialInput[],
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  inputs.forEach((item, index) => {
    const label = `기타 자재 ${index + 1}`;

    if (!item.id.trim() || ids.has(item.id)) {
      errors.push(`${label}: 식별자가 비어 있거나 중복되었습니다.`);
    }

    ids.add(item.id);

    if (!item.name.trim()) {
      errors.push(`${label}: 자재명을 입력하세요.`);
    }

    if (!item.unit.trim()) {
      errors.push(`${label}: 구매 단위를 입력하세요.`);
    }

    const quantity = Number(item.quantity);

    if (!item.quantity.trim() || !Number.isFinite(quantity) || quantity < 0) {
      errors.push(`${label}: 수량은 0 이상의 숫자로 입력하세요.`);
    }

    if (item.unitPrice.trim()) {
      const price = Number(item.unitPrice);

      if (!Number.isFinite(price) || price < 0) {
        errors.push(`${label}: 단가는 0 이상의 숫자로 입력하세요.`);
      }
    }
  });

  return errors;
}

export function calculateExtraMaterials(
  inputs: readonly ExtraMaterialInput[],
): ExtraMaterialsResult {
  const errors = validateExtraMaterials(inputs);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const items = inputs.map((item) => {
    const quantity = Number(item.quantity);

    const unitPrice = item.unitPrice.trim() ? Number(item.unitPrice) : null;

    const estimatedCost = unitPrice === null ? null : quantity * unitPrice;

    if (estimatedCost !== null && !Number.isFinite(estimatedCost)) {
      throw new Error(`${item.name}: 금액이 계산 가능한 범위를 벗어났습니다.`);
    }

    return {
      id: item.id,
      name: item.name.trim(),
      quantity,
      unit: item.unit.trim(),
      unitPrice,
      estimatedCost,
      memo: item.memo,
      sourceType: "USER_INPUT" as const,
      status: "INPUT_BASED" as const,
    };
  });

  const totalEstimatedCost = sumEstimatedCosts(
    items.map((item) => item.estimatedCost),
  );

  return {
    items,
    totalEstimatedCost,
  };
}

// 자동 산출 금액과 기타 자재비 합산에도 사용할 함수입니다.
export function sumEstimatedCosts(
  values: readonly (number | null)[],
): number | null {
  for (const value of values) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      throw new Error("합산할 금액이 올바르지 않습니다.");
    }
  }

  if (values.some((value) => value === null)) {
    return null;
  }

  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);

  if (!Number.isFinite(total)) {
    throw new Error("합계 금액이 계산 가능한 범위를 벗어났습니다.");
  }

  return total;
}
