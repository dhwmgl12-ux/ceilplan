"use client";

import { useRef, useState, type PointerEvent } from "react";
import type {
  CeilingFeature,
  CeilingFeatureType,
  SiteInput,
} from "@/types/ceilplan";
import { isBoxInsideRoom, type RoomGeometry } from "@/lib/geometry/room";

export type FeaturePointerMode = "VIEW" | "PLACE" | "MOVE";

interface PointerSession {
  pointerId: number;
  mode: "PLACE" | "MOVE";
  startX: number;
  startY: number;
  startClientX: number;
  startClientY: number;
  original: CeilingFeature;
  context: string;
}

interface FeaturePointerOptions {
  inputs: SiteInput;
  features: CeilingFeature[];
  room: RoomGeometry | null;
  onSelectFeature: (id: string | null) => void;

  // SVG 안에서 공간이 표시되는 위치와 배율
  x: number;
  y: number;
  scale: number;

  mode: FeaturePointerMode;
  featureType: CeilingFeatureType;
  widthMm: string;
  lengthMm: string;

  onAdd: (feature: CeilingFeature) => void;
  onUpdate: (feature: CeilingFeature) => void;
}

export function useFeaturePointer({
  inputs,
  features,
  room,
  x,
  y,
  scale,
  mode,
  featureType,
  widthMm,
  lengthMm,
  onAdd,
  onUpdate,
  onSelectFeature,
}: FeaturePointerOptions) {
  const sessionRef = useRef<PointerSession | null>(null);

  const [draft, setDraft] = useState<CeilingFeature | null>(null);
  const [message, setMessage] = useState("");

  const context = JSON.stringify({ inputs, features });

  function getPosition(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM();

    if (!matrix || !Number.isFinite(scale) || scale <= 0) {
      return null;
    }

    try {
      // 화면 축소와 SVG 여백을 반영해 화면 좌표를 SVG 좌표로 변환합니다.
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );

      const roomX = (point.x - x) / scale;
      const roomY = (point.y - y) / scale;

      if (![roomX, roomY].every(Number.isFinite)) {
        return null;
      }

      return { x: roomX, y: roomY };
    } catch {
      return null;
    }
  }

  function createCandidate(
    session: PointerSession,
    point: { x: number; y: number },
  ): CeilingFeature {
    const original = session.original;

    if (session.mode === "PLACE") {
      return {
        ...original,

        // 클릭한 지점이 요소 중심입니다. 포인터 배치 좌표는 1mm 단위입니다.
        xMm: Math.round(point.x - original.widthMm / 2),
        yMm: Math.round(point.y - original.lengthMm / 2),
      };
    }

    return {
      ...original,
      xMm: Math.round(original.xMm + point.x - session.startX),
      yMm: Math.round(original.yMm + point.y - session.startY),
    };
  }

  function isValid(candidate: CeilingFeature) {
    return Boolean(
      room &&
      isBoxInsideRoom(room, {
        x: candidate.xMm,
        y: candidate.yMm,
        width: candidate.widthMm,
        length: candidate.lengthMm,
      }),
    );
  }

  function clearSession() {
    sessionRef.current = null;
    setDraft(null);
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (
      mode === "VIEW" ||
      !event.isPrimary ||
      event.button !== 0 ||
      sessionRef.current
    ) {
      return;
    }

    if (!room) {
      setMessage("먼저 공간 형태와 치수를 입력하세요.");
      return;
    }

    const point = getPosition(event);
    if (!point) return;

    let original: CeilingFeature;

    if (mode === "PLACE") {
      const width = Number(widthMm);
      const length = Number(lengthMm);

      if (
        !widthMm.trim() ||
        !lengthMm.trim() ||
        ![width, length].every(Number.isFinite) ||
        width <= 0 ||
        length <= 0
      ) {
        setMessage("요소 가로·세로에 0보다 큰 숫자를 입력하세요.");
        return;
      }

      original = {
        id: "",
        type: featureType,
        xMm: 0,
        yMm: 0,
        widthMm: width,
        lengthMm: length,
      };
    } else {
      const target = event.target;

      if (!(target instanceof Element)) return;

      const id = target
        .closest("[data-feature-id]")
        ?.getAttribute("data-feature-id");

      const feature = features.find((item) => item.id === id);

      if (!feature) {
        setMessage("이동할 요소의 도형을 눌러 드래그하세요.");
        return;
      }

      original = { ...feature };
      onSelectFeature(feature.id);
    }

    const session: PointerSession = {
      pointerId: event.pointerId,
      mode,
      startX: point.x,
      startY: point.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      original,
      context,
    };

    sessionRef.current = session;
    setDraft(createCandidate(session, point));
    setMessage("");

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const session = sessionRef.current;

    if (!session || session.pointerId !== event.pointerId) return;

    const point = getPosition(event);

    if (point) {
      setDraft(createCandidate(session, point));
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    const session = sessionRef.current;

    if (!session || session.pointerId !== event.pointerId) return;

    const point = getPosition(event);

    clearSession();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!point) return;

    if (session.context !== context || session.mode !== mode) {
      setMessage("작업 중 입력이 변경되어 배치·이동을 취소했습니다.");
      return;
    }

    const distance = Math.hypot(
      event.clientX - session.startClientX,
      event.clientY - session.startClientY,
    );

    // 배치 모드에서는 짧은 클릭·터치만 배치로 처리합니다.
    if (session.mode === "PLACE" && distance > 6) {
      setMessage("배치할 위치를 짧게 클릭하거나 터치하세요.");
      return;
    }

    // 이동 모드에서 단순 클릭은 변경으로 기록하지 않습니다.
    if (session.mode === "MOVE" && distance < 3) {
      return;
    }

    const candidate = createCandidate(session, point);

    if (!isValid(candidate)) {
      setMessage(
        "요소가 공간 밖이나 제외 영역에 걸칩니다. 위치 또는 크기를 조정하세요.",
      );
      return;
    }

    if (session.mode === "PLACE") {
      onAdd({
        ...candidate,
        id: crypto.randomUUID(),
      });

      setMessage("요소를 추가했습니다. 자재 증감은 조정값에 직접 입력하세요.");
    } else if (
      candidate.xMm !== session.original.xMm ||
      candidate.yMm !== session.original.yMm
    ) {
      onUpdate(candidate);
      setMessage("요소를 이동했습니다. 계산 결과를 다시 확인하세요.");
    }
  }

  return {
    draft,
    draftValid: draft ? isValid(draft) : false,
    message,
    clearSession,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: clearSession,
  };
}
