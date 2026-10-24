"use client";

import type { useDrawingBackground } from "@/hooks/useDrawingBackground";

type DrawingBackground = ReturnType<typeof useDrawingBackground>;

interface DrawingBackgroundPanelProps {
  background: DrawingBackground;
}

export default function DrawingBackgroundPanel({
  background,
}: DrawingBackgroundPanelProps) {
  return (
    <details className="mt-4 rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        도면 이미지 배경
        {background.image && " · 선택됨"}
      </summary>

      <div className="mt-3 space-y-3">
        <p className="text-xs leading-5 text-slate-500">
          도면을 참고하면서 공간과 요소를 직접 입력합니다. 이미지 자체로
          면적이나 자재를 계산하지 않습니다.
        </p>

        <label className="block text-sm font-medium">
          도면 이미지 선택
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={background.handleFileChange}
            className="mt-2 block w-full text-sm"
          />
        </label>

        <p className="text-xs text-slate-500">PNG·JPEG·WebP, 최대 8MB</p>

        {background.loading && (
          <p role="status" className="text-sm text-blue-700">
            이미지를 읽고 있습니다.
          </p>
        )}

        {background.error && (
          <p role="alert" className="text-sm text-red-700">
            {background.error}
          </p>
        )}

        {background.image && (
          <>
            <p className="break-words text-xs text-slate-600">
              {background.image.name}
              {" · "}
              {background.image.pixelWidth} × {background.image.pixelHeight} px
            </p>

            <label className="block text-sm font-medium">
              이미지 전체 가로의 실제 길이 (mm)
              <input
                type="number"
                min="0"
                step="any"
                value={background.physicalWidth}
                onChange={(event) =>
                  background.setPhysicalWidth(event.target.value)
                }
                placeholder="이미지 전체 폭에 대응하는 길이"
                className="cp-input mt-2"
              />
            </label>

            <p className="text-xs leading-5 text-slate-500">
              공간 가로가 아니라 이미지 전체 폭에 해당하는 길이입니다. 여백이
              있는 도면은 먼저 필요한 부분으로 잘라 사용하는 것이 맞추기
              쉽습니다. 세로 길이는 이미지 비율에 따라 정해집니다.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                이미지 시작 X (mm)
                <input
                  type="number"
                  step="any"
                  value={background.offsetX}
                  onChange={(event) =>
                    background.setOffsetX(event.target.value)
                  }
                  className="cp-input mt-2"
                />
              </label>

              <label className="block text-sm font-medium">
                이미지 시작 Y (mm)
                <input
                  type="number"
                  step="any"
                  value={background.offsetY}
                  onChange={(event) =>
                    background.setOffsetY(event.target.value)
                  }
                  className="cp-input mt-2"
                />
              </label>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              공간 왼쪽 위가 X 0, Y 0입니다. 음수는 이미지를 왼쪽·위쪽으로
              옮깁니다.
            </p>

            <label className="block text-sm font-medium">
              배경 불투명도 {Math.round(background.opacity * 100)}%
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={background.opacity}
                onChange={(event) =>
                  background.setOpacity(Number(event.target.value))
                }
                className="mt-2 block w-full"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={background.visible}
                onChange={(event) =>
                  background.setVisible(event.target.checked)
                }
              />
              배경 이미지 표시
            </label>

            {!background.placementValid && (
              <p className="text-xs leading-5 text-amber-800">
                실제 가로 길이는 0보다 크게, X·Y 위치는 숫자로 입력해야 배경이
                표시됩니다.
              </p>
            )}

            <button
              type="button"
              onClick={background.remove}
              className="cp-button-secondary"
            >
              배경 이미지 제거
            </button>
          </>
        )}

        <p className="text-xs leading-5 text-slate-500">
          배경 설정은 현재 미리보기에서만 사용합니다. 새로고침·공간 전환 후에는
          다시 선택해야 합니다. 프로젝트 저장·JSON·발주용 인쇄에는 포함되지
          않습니다.
        </p>
      </div>
    </details>
  );
}
