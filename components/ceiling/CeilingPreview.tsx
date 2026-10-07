import {
  featureColors,
  featureLabels,
  type CeilingFeature,
} from "@/types/ceilplan";

interface CeilingPreviewProps {
  widthMm: string;
  lengthMm: string;
  features: CeilingFeature[];
}

export default function CeilingPreview({
  widthMm,
  lengthMm,
  features,
}: CeilingPreviewProps) {
  const width = Number(widthMm);
  const length = Number(lengthMm);

  const isValid =
    widthMm.trim() !== "" &&
    lengthMm.trim() !== "" &&
    Number.isFinite(width) &&
    Number.isFinite(length) &&
    width > 0 &&
    length > 0;

  const visibleFeatures = isValid
    ? features.filter(
        (feature) =>
          feature.xMm + feature.widthMm <= width &&
          feature.yMm + feature.lengthMm <= length,
      )
    : [];

  const outsideCount = isValid ? features.length - visibleFeatures.length : 0;

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

  return (
    <section
      aria-labelledby="preview-title"
      className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 id="preview-title" className="text-lg font-bold">
        천장 미리보기
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        입력한 공간 치수를 기준으로 표시한 2D 평면도입니다.
      </p>

      {isValid ? (
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="mt-4 block w-full"
          role="img"
          aria-labelledby="room-title room-description"
        >
          <title id="room-title">직사각형 천장 공간</title>

          <desc id="room-description">
            가로 {width.toLocaleString("ko-KR")} 밀리미터, 세로{" "}
            {length.toLocaleString("ko-KR")} 밀리미터
          </desc>

          {/* 공간 */}
          <rect
            x={x}
            y={y}
            width={roomWidth}
            height={roomHeight}
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
              <g key={feature.id}>
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

                {hasRoomForDetails && (
                  <>
                    <rect
                      x={featureX + 1}
                      y={featureY + 1}
                      width={15}
                      height={14}
                      fill="white"
                      fillOpacity={0.9}
                    />
                    <text
                      x={featureX + 8.5}
                      y={featureY + 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10}
                      fontWeight="bold"
                      fill={color}
                    >
                      {number}
                    </text>
                  </>
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
        </svg>
      ) : (
        <div
          role="status"
          className="mt-4 flex aspect-[5/4] items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-6"
        >
          <p className="text-center text-sm leading-6 text-slate-500">
            공간 가로와 세로에
            <br />
            0보다 큰 숫자를 입력해 주세요.
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
          요소는 도면에서 숨겼습니다. 목록에서 삭제하고 다시 입력하세요.
        </p>
      )}

      <p className="mt-3 text-xs leading-5 text-slate-500">
        공간 형태를 확인하는 미리보기이며, 실제 자재 배치도는 아닙니다.
      </p>
    </section>
  );
}
