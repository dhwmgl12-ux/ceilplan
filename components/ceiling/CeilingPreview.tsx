import { useId, useState } from "react";
import { useDrawingBackground } from "@/hooks/useDrawingBackground";
import DrawingBackgroundPanel from "./DrawingBackgroundPanel";
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
  type Adjustment,
} from "@/types/ceilplan";

import { tryGetRoomGeometry, isBoxInsideRoom } from "@/lib/geometry/room";

interface CeilingPreviewProps {
  inputs: SiteInput;
  features: CeilingFeature[];
  onAdd: (feature: CeilingFeature) => void;
  onUpdate: (feature: CeilingFeature) => void;
  adjustments: Adjustment[];
  activeFeatureId: string | null;
  onSelectFeature: (id: string | null) => void;
  onShowSelectedInList: () => void;
}

export default function CeilingPreview({
  inputs,
  features,
  adjustments,
  activeFeatureId,
  onSelectFeature,
  onShowSelectedInList,
  onAdd,
  onUpdate,
}: CeilingPreviewProps) {
  const background = useDrawingBackground();
  const backgroundClipId = useId().replaceAll(":", "");
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

  const roomPolygonPoints =
    room?.points
      .map((point) => `${x + point.x * scale},${y + point.y * scale}`)
      .join(" ") ?? "";

  const showBackground = Boolean(
    background.image &&
    background.visible &&
    background.placementValid &&
    isValid,
  );

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
    onSelectFeature,
  });

  const selectedFeature = features.find(
    (feature) => feature.id === activeFeatureId,
  );

  const selectedFeatureNumber = selectedFeature
    ? features.findIndex((feature) => feature.id === selectedFeature.id) + 1
    : null;

  const linkedAdjustments = adjustments.filter(
    (adjustment) => adjustment.featureId === activeFeatureId,
  );

  return (
    <section aria-labelledby="preview-title" className="cp-card min-h-80">
      <h2 id="preview-title" className="cp-title">
        천장 미리보기
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        입력한 공간 치수를 기준으로 표시한 2D 평면도입니다.
      </p>

      <DrawingBackgroundPanel background={background} />

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
            ? "도형을 클릭·터치하면 목록과 연결된 조정값이 강조됩니다. 키보드로 도형에 이동한 뒤 Enter 또는 Space로 선택할 수도 있습니다."
            : pointerMode === "PLACE"
              ? "크기를 입력하고 도면을 클릭·터치하세요. 선택한 지점이 요소 중심입니다."
              : "이동할 도형을 누른 채 끌어 놓으세요. 해당 요소도 함께 선택됩니다."}
        </p>

        <p role="status" className="mt-2 text-xs leading-5 text-blue-700">
          {pointer.message}
        </p>
      </div>

      {selectedFeature && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                선택: {selectedFeatureNumber}번{" "}
                {featureLabels[selectedFeature.type]}
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                X {selectedFeature.xMm}, Y {selectedFeature.yMm} mm
                <br />
                가로 {selectedFeature.widthMm} × 세로 {selectedFeature.lengthMm}{" "}
                mm
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectFeature(null)}
              className="cp-button-secondary"
            >
              선택 해제
            </button>
          </div>

          <button
            type="button"
            onClick={onShowSelectedInList}
            className="cp-button-secondary mt-3"
          >
            요소 목록으로 이동
          </button>

          <h4 className="mt-4 text-xs font-semibold">
            연결된 조정값 {linkedAdjustments.length}개
          </h4>

          {linkedAdjustments.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              연결된 조정값이 없습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {linkedAdjustments.map((adjustment) => (
                <li
                  key={adjustment.id}
                  className="rounded bg-white p-2 text-xs leading-5"
                >
                  <p className="font-medium">
                    {adjustment.materialId === "BOARD"
                      ? "석고보드"
                      : adjustment.materialId === "MBAR"
                        ? "M-BAR"
                        : "캐링채널"}
                    {" · "}
                    {adjustment.adjustmentType === "ADD" ? "추가" : "공제"}{" "}
                    {adjustment.quantity} {adjustment.unit}
                  </p>

                  <p className="break-words text-slate-600">
                    {adjustment.memo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isValid ? (
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="mt-4 block w-full"
          role="group"
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
          onClick={(event) => {
            if (pointerMode !== "VIEW") return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            const id = target
              .closest("[data-feature-id]")
              ?.getAttribute("data-feature-id");

            onSelectFeature(id ?? null);
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
          <defs>
            <clipPath id={backgroundClipId}>
              <polygon points={roomPolygonPoints} />
            </clipPath>
          </defs>

          {/* 공간 바탕 */}
          <polygon
            points={roomPolygonPoints}
            fill="#eff6ff"
            pointerEvents="none"
          />

          {/* 참고용 배경 이미지 */}
          {showBackground && background.image && (
            <g
              clipPath={`url(#${backgroundClipId})`}
              pointerEvents="none"
              aria-hidden="true"
            >
              <image
                href={background.image.url}
                x={x + background.xMm * scale}
                y={y + background.yMm * scale}
                width={background.widthMm * scale}
                height={background.heightMm * scale}
                preserveAspectRatio="xMinYMin meet"
                opacity={background.opacity}
              />
            </g>
          )}

          {/* 이미지 위에 공간 외곽선을 표시 */}
          <polygon
            points={roomPolygonPoints}
            fill="none"
            stroke="#334155"
            strokeWidth={3}
            pointerEvents="none"
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
              <g
                key={feature.id}
                data-feature-id={feature.id}
                role="button"
                tabIndex={0}
                aria-label={`${number}번 ${label} 선택`}
                aria-pressed={activeFeatureId === feature.id}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;

                  event.preventDefault();
                  event.stopPropagation();

                  pointer.clearSession();
                  onSelectFeature(feature.id);
                }}
              >
                <title>
                  {number}번 {label}: X {feature.xMm}, Y {feature.yMm} mm, 크기{" "}
                  {feature.widthMm} × {feature.lengthMm} mm
                </title>

                {activeFeatureId === feature.id && (
                  <rect
                    x={featureX - 4}
                    y={featureY - 4}
                    width={Math.max(featureWidth, 1) + 8}
                    height={Math.max(featureHeight, 1) + 8}
                    rx={3}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                    aria-hidden="true"
                  />
                )}

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
