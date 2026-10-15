import { useState } from "react";
import {
  useFeaturePointer,
  type FeaturePointerMode,
} from "@/hooks/useFeaturePointer";

import {
  featureColors,
  featureLabels,
  type CeilingFeature,
  type SiteInput,
  type CeilingFeatureType,
} from "@/types/ceilplan";

import { tryGetRoomGeometry, isBoxInsideRoom } from "@/lib/geometry/room";

interface CeilingPreviewProps {
  inputs: SiteInput;
  features: CeilingFeature[];
  onAdd: (feature: CeilingFeature) => void;
  onUpdate: (feature: CeilingFeature) => void;
}

export default function CeilingPreview({
  inputs,
  features,
  onAdd,
  onUpdate,
}: CeilingPreviewProps) {
  const [pointerMode, setPointerMode] = useState<FeaturePointerMode>("VIEW");

  const [placementType, setPlacementType] =
    useState<CeilingFeatureType>("AIR_CONDITIONER");

  const [placementWidth, setPlacementWidth] = useState("");
  const [placementLength, setPlacementLength] = useState("");

  const room = tryGetRoomGeometry(inputs);
  const width = room?.width ?? 0;
  const length = room?.length ?? 0;
  const isValid = room !== null;

  const visibleFeatures = room
    ? features.filter((feature) =>
        isBoxInsideRoom(room, {
          x: feature.xMm,
          y: feature.yMm,
          width: feature.widthMm,
          length: feature.lengthMm,
        }),
      )
    : [];

  const outsideCount = room ? features.length - visibleFeatures.length : 0;
  // 이 아래의 기존 canvasWidth와 배율 계산은 유지합니다.

  // SVG 내부 좌표 기준의 표시 영역입니다.
  // 실제 공간 치수나 시공 기준이 아닙니다.
  const canvasWidth = 500;
  const canvasHeight = 400;
  const maxRoomWidth = 360;
  const maxRoomHeight = 260;

  const scale = isValid
    ? Math.min(maxRoomWidth / width, maxRoomHeight / length)
    : 0;

  const roomWidth = width * scale;
  const roomHeight = length * scale;

  const x = (canvasWidth - roomWidth) / 2;
  const y = (canvasHeight - roomHeight) / 2;

  const dimensionY = y - 24;
  const dimensionX = x - 24;

  const pointer = useFeaturePointer({
    inputs,
    features,
    room,
    x,
    y,
    scale,
    mode: pointerMode,
    featureType: placementType,
    widthMm: placementWidth,
    lengthMm: placementLength,
    onAdd,
    onUpdate,
  });

  return (
    <section aria-labelledby="preview-title" className="cp-card min-h-80">
      <h2 id="preview-title" className="cp-title">
        천장 미리보기
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        입력한 공간 치수를 기준으로 표시한 2D 평면도입니다.
      </p>

      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div
          role="group"
          aria-label="도면 조작 모드"
          className="flex flex-wrap gap-2"
        >
          {(
            [
              ["VIEW", "보기"],
              ["PLACE", "요소 배치"],
              ["MOVE", "요소 이동"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={pointerMode === mode}
              onClick={() => {
                pointer.clearSession();
                setPointerMode(mode);
              }}
              className={
                pointerMode === mode
                  ? "cp-button-primary"
                  : "cp-button-secondary"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {pointerMode === "PLACE" && (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium">
              배치할 요소
              <select
                value={placementType}
                onChange={(event) => {
                  pointer.clearSession();
                  setPlacementType(event.target.value as CeilingFeatureType);
                }}
                className="cp-input mt-2"
              >
                {Object.entries(featureLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                가로 (mm)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={placementWidth}
                  onChange={(event) => {
                    pointer.clearSession();
                    setPlacementWidth(event.target.value);
                  }}
                  className="cp-input mt-2"
                />
              </label>

              <label className="block text-sm font-medium">
                세로 (mm)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={placementLength}
                  onChange={(event) => {
                    pointer.clearSession();
                    setPlacementLength(event.target.value);
                  }}
                  className="cp-input mt-2"
                />
              </label>
            </div>
          </div>
        )}

        <p
          id="preview-pointer-help"
          className="mt-3 text-xs leading-5 text-slate-500"
        >
          {pointerMode === "VIEW"
            ? "보기 모드에서는 모바일 화면을 스크롤할 수 있습니다."
            : pointerMode === "PLACE"
              ? "크기를 입력하고 도면을 클릭·터치하세요. 선택한 지점이 요소 중심입니다."
              : "이동할 도형을 누른 채 끌어 놓으세요. 정밀한 위치·크기는 현장 요소 목록에서 수정할 수 있습니다."}
        </p>

        <p role="status" className="mt-2 text-xs leading-5 text-blue-700">
          {pointer.message}
        </p>
      </div>

      {isValid ? (
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="mt-4 block w-full"
          role="img"
          aria-labelledby="room-title room-description"
          aria-describedby="preview-pointer-help"
          style={{
            touchAction: pointerMode === "VIEW" ? "auto" : "none",
            cursor:
              pointerMode === "PLACE"
                ? "crosshair"
                : pointerMode === "MOVE"
                  ? "grab"
                  : "default",
          }}
          onPointerDown={pointer.handlePointerDown}
          onPointerMove={pointer.handlePointerMove}
          onPointerUp={pointer.handlePointerUp}
          onPointerCancel={pointer.handlePointerCancel}
          onLostPointerCapture={pointer.handlePointerCancel}
        >
          <title id="room-title">천장 공간 외곽 형태</title>

          <desc id="room-description">
            가로 {width.toLocaleString("ko-KR")} 밀리미터, 세로{" "}
            {length.toLocaleString("ko-KR")} 밀리미터
          </desc>

          {/* 공간 */}
          <polygon
            points={
              room?.points
                .map((point) => `${x + point.x * scale},${y + point.y * scale}`)
                .join(" ") ?? ""
            }
            fill="#eff6ff"
            stroke="#334155"
            strokeWidth={3}
          />

          {/* 현장 요소 */}
          {visibleFeatures.map((feature) => {
            const featureX = x + feature.xMm * scale;
            const featureY = y + feature.yMm * scale;

            const featureWidth = feature.widthMm * scale;
            const featureHeight = feature.lengthMm * scale;

            const centerX = featureX + featureWidth / 2;
            const centerY = featureY + featureHeight / 2;

            const color = featureColors[feature.type];
            const label = featureLabels[feature.type];
            const number =
              features.findIndex((item) => item.id === feature.id) + 1;

            const hasRoomForDetails = featureWidth >= 24 && featureHeight >= 18;

            return (
              <g key={feature.id} data-feature-id={feature.id}>
                <title>
                  {number}번 {label}: X {feature.xMm}, Y {feature.yMm} mm, 크기{" "}
                  {feature.widthMm} × {feature.lengthMm} mm
                </title>

                {feature.type === "SPRINKLER" ? (
                  <>
                    <ellipse
                      cx={centerX}
                      cy={centerY}
                      rx={featureWidth / 2}
                      ry={featureHeight / 2}
                      fill={color}
                      fillOpacity={0.1}
                      stroke={color}
                      strokeWidth={2}
                    />

                    {hasRoomForDetails && (
                      <>
                        <line
                          x1={centerX - featureWidth * 0.2}
                          y1={centerY}
                          x2={centerX + featureWidth * 0.2}
                          y2={centerY}
                          stroke={color}
                        />
                        <line
                          x1={centerX}
                          y1={centerY - featureHeight * 0.2}
                          x2={centerX}
                          y2={centerY + featureHeight * 0.2}
                          stroke={color}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <rect
                    x={featureX}
                    y={featureY}
                    width={featureWidth}
                    height={featureHeight}
                    fill={color}
                    fillOpacity={0.12}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={
                      feature.type === "INSPECTION_HATCH" ? "5 3" : undefined
                    }
                  />
                )}

                {feature.type === "AIR_CONDITIONER" && hasRoomForDetails && (
                  <>
                    {[0.3, 0.5, 0.7].map((ratio) => (
                      <line
                        key={ratio}
                        x1={featureX + featureWidth * 0.2}
                        y1={featureY + featureHeight * ratio}
                        x2={featureX + featureWidth * 0.8}
                        y2={featureY + featureHeight * ratio}
                        stroke={color}
                        strokeWidth={1.5}
                      />
                    ))}
                  </>
                )}

                {feature.type === "LIGHT_BOX" && hasRoomForDetails && (
                  <rect
                    x={featureX + featureWidth * 0.12}
                    y={featureY + featureHeight * 0.2}
                    width={featureWidth * 0.76}
                    height={featureHeight * 0.6}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}

          {/* 가로 치수선 */}
          <line
            x1={x}
            y1={dimensionY}
            x2={x + roomWidth}
            y2={dimensionY}
            stroke="#64748b"
          />

          <line
            x1={x}
            y1={dimensionY - 5}
            x2={x}
            y2={dimensionY + 5}
            stroke="#64748b"
          />

          <line
            x1={x + roomWidth}
            y1={dimensionY - 5}
            x2={x + roomWidth}
            y2={dimensionY + 5}
            stroke="#64748b"
          />

          <text
            x={canvasWidth / 2}
            y={dimensionY - 10}
            textAnchor="middle"
            fontSize={13}
            fill="#334155"
          >
            {width.toLocaleString("ko-KR")} mm
          </text>

          {/* 세로 치수선 */}
          <line
            x1={dimensionX}
            y1={y}
            x2={dimensionX}
            y2={y + roomHeight}
            stroke="#64748b"
          />

          <line
            x1={dimensionX - 5}
            y1={y}
            x2={dimensionX + 5}
            y2={y}
            stroke="#64748b"
          />

          <line
            x1={dimensionX - 5}
            y1={y + roomHeight}
            x2={dimensionX + 5}
            y2={y + roomHeight}
            stroke="#64748b"
          />

          <text
            transform={`translate(${dimensionX - 12}, ${canvasHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={13}
            fill="#334155"
          >
            {length.toLocaleString("ko-KR")} mm
          </text>

          {/* 번호는 도형과 치수선을 그린 뒤 마지막에 표시합니다. */}
          <g aria-hidden="true" pointerEvents="none">
            {visibleFeatures.map((feature) => {
              const number =
                features.findIndex((item) => item.id === feature.id) + 1;

              const featureX = x + feature.xMm * scale;
              const featureY = y + feature.yMm * scale;
              const featureWidth = feature.widthMm * scale;
              const featureHeight = feature.lengthMm * scale;

              const centerX = featureX + featureWidth / 2;
              const centerY = featureY + featureHeight / 2;

              const color = featureColors[feature.type];

              // 아래 값은 SVG 표시 크기이며 실제 시공 치수가 아닙니다.
              const badgeWidth = Math.max(22, String(number).length * 8 + 10);
              const badgeHeight = 18;
              const gap = 8;
              const canvasPadding = 8;

              const fitsInside =
                featureWidth >= badgeWidth + 4 &&
                featureHeight >= badgeHeight + 4;

              // 작은 요소는 우측에 표시하고, 캔버스 밖으로 나가면 좌측에 표시합니다.
              const rightX = featureX + featureWidth + gap;
              const placeOnRight =
                rightX + badgeWidth <= canvasWidth - canvasPadding;

              const outsideX = placeOnRight
                ? rightX
                : featureX - gap - badgeWidth;

              const badgeX = fitsInside
                ? featureX + 2
                : Math.max(
                    canvasPadding,
                    Math.min(
                      outsideX,
                      canvasWidth - badgeWidth - canvasPadding,
                    ),
                  );

              const badgeY = fitsInside
                ? featureY + 2
                : Math.max(
                    canvasPadding,
                    Math.min(
                      centerY - badgeHeight / 2,
                      canvasHeight - badgeHeight - canvasPadding,
                    ),
                  );

              const lineEndX = placeOnRight ? badgeX : badgeX + badgeWidth;

              return (
                <g key={`feature-number-${feature.id}`}>
                  {!fitsInside && (
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={lineEndX}
                      y2={badgeY + badgeHeight / 2}
                      stroke={color}
                      strokeWidth={1}
                    />
                  )}

                  <rect
                    x={badgeX}
                    y={badgeY}
                    width={badgeWidth}
                    height={badgeHeight}
                    rx={3}
                    fill="white"
                    fillOpacity={0.95}
                    stroke={color}
                    strokeWidth={1}
                  />

                  <text
                    x={badgeX + badgeWidth / 2}
                    y={badgeY + badgeHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight="bold"
                    fill={color}
                  >
                    {number}
                  </text>
                </g>
              );
            })}
          </g>

          {pointer.draft && (
            <rect
              x={x + pointer.draft.xMm * scale}
              y={y + pointer.draft.yMm * scale}
              width={pointer.draft.widthMm * scale}
              height={pointer.draft.lengthMm * scale}
              fill={pointer.draftValid ? "#2563eb" : "#dc2626"}
              fillOpacity={0.15}
              stroke={pointer.draftValid ? "#2563eb" : "#dc2626"}
              strokeWidth={2}
              strokeDasharray="5 3"
              pointerEvents="none"
              aria-hidden="true"
            />
          )}
        </svg>
      ) : (
        <div
          role="status"
          className="mt-4 flex aspect-[5/4] items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-6"
        >
          <p className="text-center text-sm leading-6 text-slate-500">
            공간 형태와 전체 치수,
            <br />
            제외 영역의 치수를 확인해 주세요.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(featureLabels).map(([type, label]) => {
          const count = features.filter(
            (feature) => feature.type === type,
          ).length;

          return (
            <span
              key={type}
              className="flex items-center gap-1.5 text-xs text-slate-600"
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 border-2"
                style={{
                  borderColor: featureColors[type as CeilingFeature["type"]],
                  borderStyle: type === "INSPECTION_HATCH" ? "dashed" : "solid",
                  borderRadius: type === "SPRINKLER" ? "50%" : "2px",
                }}
              />
              {label} × {count}
            </span>
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        도면 번호는 현장 요소 목록과 연결됩니다. 개수는 공간 밖 요소도 포함한
        등록 수입니다.
      </p>

      {outsideCount > 0 && (
        <p role="alert" className="mt-3 text-xs leading-5 text-red-700">
          공간 크기 변경으로 요소 {outsideCount}개가 범위를 벗어났습니다. 해당
          요소는 도면에서 숨겼습니다. 현장 요소 목록에서 위치·크기를 수정하거나
          삭제하세요.
        </p>
      )}

      <p className="mt-3 text-xs leading-5 text-slate-500">
        공간 형태를 확인하는 미리보기이며, 실제 자재 배치도는 아닙니다.
      </p>
    </section>
  );
}
