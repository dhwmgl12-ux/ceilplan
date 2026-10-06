export interface SiteInput {
  name: string;
  widthMm: string;
  lengthMm: string;
}

export interface MaterialInput {
  mbarSpacingMm: string;
  carryingSpacingMm: string;

  boardWidthMm: string;
  boardLengthMm: string;
  layerCount: string;

  boardLossPercent: string;
  metalLossPercent: string;

  mbarStockLengthMm: string;
  carryingStockLengthMm: string;

  boardUnitPrice: string;
  mbarUnitPrice: string;
  carryingUnitPrice: string;
}
