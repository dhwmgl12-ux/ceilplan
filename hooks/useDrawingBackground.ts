"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

interface DrawingImage {
  url: string;
  name: string;
  pixelWidth: number;
  pixelHeight: number;
}

// 업로드 용량 제한입니다. 시공 기준이 아닙니다.
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;

export function useDrawingBackground() {
  const [image, setImage] = useState<DrawingImage | null>(null);

  const [physicalWidth, setPhysicalWidth] = useState("");
  const [offsetX, setOffsetX] = useState("0");
  const [offsetY, setOffsetY] = useState("0");
  const [opacity, setOpacity] = useState(0.4);
  const [visible, setVisible] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestId = useRef(0);

  // 이미지 교체·삭제 시 이전 주소를 해제합니다.
  useEffect(() => {
    if (!image) return;

    return () => {
      URL.revokeObjectURL(image.url);
    };
  }, [image]);

  // 화면이 사라진 뒤 완료된 업로드를 반영하지 않습니다.
  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const currentRequest = ++requestId.current;
    let temporaryUrl: string | null = null;

    setLoading(true);
    setError("");

    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        throw new Error("PNG·JPEG·WebP 이미지를 선택하세요.");
      }

      if (file.size > MAX_FILE_BYTES) {
        throw new Error("도면 이미지는 8MB 이하여야 합니다.");
      }

      temporaryUrl = URL.createObjectURL(file);

      const decoded = new Image();
      decoded.src = temporaryUrl;

      await decoded.decode();

      const width = decoded.naturalWidth;
      const height = decoded.naturalHeight;

      if (width <= 0 || height <= 0 || width * height > MAX_IMAGE_PIXELS) {
        throw new Error(
          "이미지 크기를 확인하세요. 가로×세로는 4천만 픽셀 이하여야 합니다.",
        );
      }

      if (currentRequest !== requestId.current) return;

      setImage({
        url: temporaryUrl,
        name: file.name,
        pixelWidth: width,
        pixelHeight: height,
      });

      // 새 이미지에는 이전 이미지의 축척을 이어 쓰지 않습니다.
      setPhysicalWidth("");
      setOffsetX("0");
      setOffsetY("0");
      setVisible(true);

      temporaryUrl = null;
    } catch (caught) {
      if (currentRequest === requestId.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : "이미지를 읽지 못했습니다.",
        );
      }
    } finally {
      if (temporaryUrl) {
        URL.revokeObjectURL(temporaryUrl);
      }

      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }

  function remove() {
    requestId.current += 1;

    setImage(null);
    setPhysicalWidth("");
    setOffsetX("0");
    setOffsetY("0");
    setLoading(false);
    setError("");
  }

  const widthMm = Number(physicalWidth);
  const xMm = Number(offsetX);
  const yMm = Number(offsetY);

  const placementValid = Boolean(
    image &&
    physicalWidth.trim() &&
    offsetX.trim() &&
    offsetY.trim() &&
    Number.isFinite(widthMm) &&
    widthMm > 0 &&
    Number.isFinite(xMm) &&
    Number.isFinite(yMm) &&
    Number.isFinite(widthMm * (image.pixelHeight / image.pixelWidth)),
  );

  const heightMm =
    image && placementValid
      ? widthMm * (image.pixelHeight / image.pixelWidth)
      : 0;

  return {
    image,
    physicalWidth,
    setPhysicalWidth,
    offsetX,
    setOffsetX,
    offsetY,
    setOffsetY,
    opacity,
    setOpacity,
    visible,
    setVisible,
    loading,
    error,
    handleFileChange,
    remove,
    placementValid,
    widthMm,
    heightMm,
    xMm,
    yMm,
  };
}
