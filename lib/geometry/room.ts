import type { SiteInput, RoomShapeType } from "../../types/ceilplan";

export interface RoomPoint {
  x: number;
  y: number;
}

export interface RoomBox {
  x: number;
  y: number;
  width: number;
  length: number;
}

export interface RoomGeometry {
  shape: RoomShapeType;
  width: number;
  length: number;
  areaM2: number;
  points: RoomPoint[];
  cutout: RoomBox | null;
}

function positiveNumber(raw: string | undefined, label: string): number {
  const value = Number(raw);

  if (
    typeof raw !== "string" ||
    !raw.trim() ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(`${label}에 0보다 큰 숫자를 입력하세요.`);
  }

  return value;
}

function rectangleArea(width: number, length: number): number {
  return (width / 1000) * (length / 1000);
}

export function getRoomGeometry(site: SiteInput): RoomGeometry {
  const width = positiveNumber(site.widthMm, "전체 가로");
  const length = positiveNumber(site.lengthMm, "전체 세로");

  const shape = site.shape ?? "RECTANGLE";

  if (shape !== "RECTANGLE" && shape !== "L" && shape !== "U") {
    throw new Error("지원하지 않는 공간 형태입니다.");
  }

  let points: RoomPoint[];
  let cutout: RoomBox | null = null;
  let areaM2: number;

  if (shape === "RECTANGLE") {
    points = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: length },
      { x: 0, y: length },
    ];

    areaM2 = rectangleArea(width, length);
  } else {
    const cutWidth = positiveNumber(site.cutoutWidthMm, "제외 영역 가로");
    const cutLength = positiveNumber(site.cutoutLengthMm, "제외 영역 세로");

    if (cutWidth >= width || cutLength >= length) {
      throw new Error(
        "제외 영역의 가로·세로는 각각 전체 가로·세로보다 작아야 합니다.",
      );
    }

    if (shape === "L") {
      // 왼쪽 아래를 제외합니다.
      const cutTop = length - cutLength;

      cutout = {
        x: 0,
        y: cutTop,
        width: cutWidth,
        length: cutLength,
      };

      points = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: length },
        { x: cutWidth, y: length },
        { x: cutWidth, y: cutTop },
        { x: 0, y: cutTop },
      ];

      // 서로 겹치지 않는 두 직사각형 면적의 합
      areaM2 =
        rectangleArea(width, cutTop) +
        rectangleArea(width - cutWidth, cutLength);
    } else {
      // 오른쪽 중간을 제외합니다.
      const cutTop = positiveNumber(site.cutoutTopMm, "제외 영역의 위쪽 거리");

      // 더하기 대신 남는 길이와 비교하여 범위를 검사합니다.
      if (cutTop >= length - cutLength) {
        throw new Error(
          "ㄷ자는 제외 영역 위쪽과 아래쪽에 공간이 남아야 합니다.",
        );
      }

      const cutLeft = width - cutWidth;
      const cutBottom = cutTop + cutLength;

      cutout = {
        x: cutLeft,
        y: cutTop,
        width: cutWidth,
        length: cutLength,
      };

      points = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: cutTop },
        { x: cutLeft, y: cutTop },
        { x: cutLeft, y: cutBottom },
        { x: width, y: cutBottom },
        { x: width, y: length },
        { x: 0, y: length },
      ];

      // 서로 겹치지 않는 세 직사각형 면적의 합
      areaM2 =
        rectangleArea(width, cutTop) +
        rectangleArea(cutLeft, cutLength) +
        rectangleArea(width, length - cutBottom);
    }
  }

  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    throw new Error("공간 면적이 계산 가능한 범위를 벗어났습니다.");
  }

  return {
    shape,
    width,
    length,
    areaM2,
    points,
    cutout,
  };
}

export function tryGetRoomGeometry(site: SiteInput): RoomGeometry | null {
  try {
    return getRoomGeometry(site);
  } catch {
    return null;
  }
}

export function validateRoom(site: SiteInput): string[] {
  try {
    getRoomGeometry(site);
    return [];
  } catch (error) {
    return [
      error instanceof Error ? error.message : "공간 형태와 치수를 확인하세요.",
    ];
  }
}

export function isBoxInsideRoom(room: RoomGeometry, box: RoomBox): boolean {
  if (
    ![box.x, box.y, box.width, box.length].every(Number.isFinite) ||
    box.x < 0 ||
    box.y < 0 ||
    box.width <= 0 ||
    box.length <= 0
  ) {
    return false;
  }

  const right = box.x + box.width;
  const bottom = box.y + box.length;

  if (
    !Number.isFinite(right) ||
    !Number.isFinite(bottom) ||
    right > room.width ||
    bottom > room.length
  ) {
    return false;
  }

  if (!room.cutout) return true;

  const cutout = room.cutout;

  // 경계에 닿는 것은 허용하지만,
  // 제외 영역과 면적으로 겹치면 공간 밖입니다.
  const overlapsCutout =
    box.x < cutout.x + cutout.width &&
    right > cutout.x &&
    box.y < cutout.y + cutout.length &&
    bottom > cutout.y;

  return !overlapsCutout;
}
