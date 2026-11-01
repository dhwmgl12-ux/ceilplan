"use client";

import { useState } from "react";
import {
  featureLabels,
  type CeilingFeature,
  type SiteInput,
} from "@/types/ceilplan";
import { createRepeatedFeatures, MAX_REPEAT_COUNT } from "@/lib/feature-tools";
import {
  deleteFeatureTemplate,
  readFeatureTemplates,
  saveFeatureTemplate,
  type FeatureTemplate,
} from "@/lib/feature-template-storage";
import { getRoomGeometry, isBoxInsideRoom } from "@/lib/geometry/room";
import ToolSection from "@/components/ui/ToolSection";

interface FeatureToolsPanelProps {
  inputs: SiteInput;
  features: CeilingFeature[];
  activeFeatureId: string | null;
  onAddMany: (features: CeilingFeature[]) => void;
}

export default function FeatureToolsPanel({
  inputs,
  features,
  activeFeatureId,
  onAddMany,
}: FeatureToolsPanelProps) {
  const [offsetX, setOffsetX] = useState("");
  const [offsetY, setOffsetY] = useState("");
  const [count, setCount] = useState("1");

  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<FeatureTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateX, setTemplateX] = useState("");
  const [templateY, setTemplateY] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedFeature = features.find(
    (feature) => feature.id === activeFeatureId,
  );

  function run(action: () => string) {
    setError("");
    setNotice("");

    try {
      setNotice(action());
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
      );
    }
  }

  function addCopies(single: boolean) {
    run(() => {
      if (!selectedFeature) {
        throw new Error("먼저 도면이나 목록에서 요소를 선택하세요.");
      }

      if (!offsetX.trim() || !offsetY.trim()) {
        throw new Error(
          "X·Y 이동 간격을 입력하세요. 이동하지 않는 축은 0입니다.",
        );
      }

      if (!single && !count.trim()) {
        throw new Error("추가 개수를 입력하세요.");
      }

      const additionalCount = single ? 1 : Number(count);

      if (
        !Number.isInteger(additionalCount) ||
        additionalCount < 1 ||
        additionalCount > MAX_REPEAT_COUNT
      ) {
        throw new Error(
          `추가 개수는 1~${MAX_REPEAT_COUNT} 사이의 정수로 입력하세요.`,
        );
      }

      const copies = createRepeatedFeatures(
        inputs,
        selectedFeature,
        {
          additionalCount,
          offsetXMm: Number(offsetX),
          offsetYMm: Number(offsetY),
        },
        Array.from({ length: additionalCount }, () => crypto.randomUUID()),
      );

      onAddMany(copies);

      return `요소 ${copies.length}개를 추가했습니다. 연결된 조정값은 복사하지 않았습니다.`;
    });
  }

  function saveTemplate() {
    run(() => {
      if (!selectedFeature) {
        throw new Error("템플릿으로 저장할 요소를 선택하세요.");
      }

      const name = templateName.trim();

      if (!name) {
        throw new Error("템플릿 이름을 입력하세요.");
      }

      const template: FeatureTemplate = {
        id: crypto.randomUUID(),
        name,
        type: selectedFeature.type,
        widthMm: selectedFeature.widthMm,
        lengthMm: selectedFeature.lengthMm,
      };

      const next = saveFeatureTemplate(template);

      setTemplates(next);
      setSelectedTemplateId(template.id);
      setTemplateName("");

      return "선택한 요소의 종류와 크기를 템플릿으로 저장했습니다.";
    });
  }

  function loadTemplates() {
    run(() => {
      const next = readFeatureTemplates();

      setTemplates(next);
      setSelectedTemplateId((previous) =>
        next.some((item) => item.id === previous)
          ? previous
          : (next[0]?.id ?? ""),
      );

      return next.length
        ? `템플릿 ${next.length}개를 불러왔습니다.`
        : "저장된 템플릿이 없습니다.";
    });
  }

  function placeTemplate() {
    run(() => {
      // 다른 탭에서 변경했을 수 있으므로 최신 목록을 읽습니다.
      const latest = readFeatureTemplates();
      const template = latest.find((item) => item.id === selectedTemplateId);

      if (!template) {
        throw new Error("템플릿 목록을 불러오고 사용할 항목을 선택하세요.");
      }

      if (!templateX.trim() || !templateY.trim()) {
        throw new Error("템플릿을 배치할 X·Y 위치를 입력하세요.");
      }

      const feature: CeilingFeature = {
        id: crypto.randomUUID(),
        type: template.type,
        xMm: Number(templateX),
        yMm: Number(templateY),
        widthMm: template.widthMm,
        lengthMm: template.lengthMm,
      };

      const room = getRoomGeometry(inputs);

      if (
        !isBoxInsideRoom(room, {
          x: feature.xMm,
          y: feature.yMm,
          width: feature.widthMm,
          length: feature.lengthMm,
        })
      ) {
        throw new Error("요소가 공간 밖이나 제외 영역에 걸칩니다.");
      }

      onAddMany([feature]);

      return "템플릿 요소를 추가했습니다.";
    });
  }

  function removeTemplate() {
    run(() => {
      if (!selectedTemplateId) {
        throw new Error("삭제할 템플릿을 선택하세요.");
      }

      if (
        !window.confirm("선택한 템플릿을 삭제할까요? 배치한 요소는 유지됩니다.")
      ) {
        return "템플릿 삭제를 취소했습니다.";
      }

      const next = deleteFeatureTemplate(selectedTemplateId);

      setTemplates(next);
      setSelectedTemplateId("");

      return "템플릿을 삭제했습니다.";
    });
  }

  return (
    <section aria-labelledby="feature-tools-title" className="cp-card">
      <h2 id="feature-tools-title" className="cp-title">
        보조 도구
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        반복 작업과 자주 사용하는 요소 규격을 관리합니다. 연결된 자재 조정값은
        복사하지 않습니다.
      </p>

      <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-700">
          {selectedFeature
            ? `${features.indexOf(selectedFeature) + 1}번 ${featureLabels[selectedFeature.type]} 선택 중`
            : "선택된 요소 없음"}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {selectedFeature
            ? `${selectedFeature.widthMm} × ${selectedFeature.lengthMm} mm · 복제와 템플릿 저장에 사용합니다.`
            : "복제·템플릿 저장은 요소 선택 후 가능합니다. 저장한 템플릿 배치는 선택 없이 사용할 수 있습니다."}
        </p>
      </div>

      <ToolSection
        title="복제·반복 배치"
        description="선택 요소를 지정한 간격으로 추가합니다."
        status={selectedFeature ? "사용 가능" : "요소 선택 필요"}
        className="mt-3"
      >
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            X 이동 간격 (mm)
            <input
              type="number"
              step="any"
              value={offsetX}
              onChange={(event) => setOffsetX(event.target.value)}
              className="cp-input mt-2"
              placeholder="왼쪽은 음수"
            />
          </label>

          <label className="text-sm">
            Y 이동 간격 (mm)
            <input
              type="number"
              step="any"
              value={offsetY}
              onChange={(event) => setOffsetY(event.target.value)}
              className="cp-input mt-2"
              placeholder="위쪽은 음수"
            />
          </label>

          <label className="col-span-2 text-sm">
            원본 외 추가 개수
            <input
              type="number"
              min="1"
              max={MAX_REPEAT_COUNT}
              step="1"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="cp-input mt-2"
            />
          </label>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          반복 위치는 원본에서 간격의 1배, 2배, 3배 순서입니다. 요소끼리 겹칠 수
          있으니 도면을 확인하세요.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!selectedFeature}
            onClick={() => addCopies(true)}
            className="cp-button-secondary disabled:opacity-50"
          >
            1개 복제
          </button>

          <button
            type="button"
            disabled={!selectedFeature}
            onClick={() => addCopies(false)}
            className="cp-button-primary disabled:opacity-50"
          >
            반복 배치
          </button>
        </div>
      </ToolSection>

      <ToolSection
        title="사용자 템플릿"
        description="요소 규격을 저장하거나 저장한 규격으로 배치합니다."
        status={
          templates.length > 0
            ? `불러온 항목 ${templates.length}개`
            : "목록 불러오기"
        }
        className="mt-3"
      >
        <label className="mt-3 block text-sm">
          새 템플릿 이름
          <input
            type="text"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            className="cp-input mt-2"
            placeholder="선택한 요소의 종류와 크기 저장"
          />
        </label>

        <button
          type="button"
          disabled={!selectedFeature}
          onClick={saveTemplate}
          className="cp-button-secondary mt-3 disabled:opacity-50"
        >
          선택 요소를 템플릿으로 저장
        </button>

        <button
          type="button"
          onClick={loadTemplates}
          className="cp-button-secondary mt-3"
        >
          템플릿 목록 불러오기
        </button>

        <label className="mt-3 block text-sm">
          사용할 템플릿
          <select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            className="cp-input mt-2"
          >
            <option value="">선택하세요</option>

            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {featureLabels[template.type]}
                {" · "}
                {template.widthMm} × {template.lengthMm} mm
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            배치 X (mm)
            <input
              type="number"
              min="0"
              step="any"
              value={templateX}
              onChange={(event) => setTemplateX(event.target.value)}
              className="cp-input mt-2"
            />
          </label>

          <label className="text-sm">
            배치 Y (mm)
            <input
              type="number"
              min="0"
              step="any"
              value={templateY}
              onChange={(event) => setTemplateY(event.target.value)}
              className="cp-input mt-2"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!selectedTemplateId}
            onClick={placeTemplate}
            className="cp-button-primary disabled:opacity-50"
          >
            템플릿 배치
          </button>

          <button
            type="button"
            disabled={!selectedTemplateId}
            onClick={removeTemplate}
            className="cp-button-secondary disabled:opacity-50"
          >
            템플릿 삭제
          </button>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          템플릿은 이 브라우저에 별도로 저장합니다. 프로젝트 JSON에는 템플릿
          목록이 포함되지 않습니다. 배치한 요소는 프로젝트에 저장됩니다.
        </p>
      </ToolSection>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-3 text-sm text-blue-700">
          {notice}
        </p>
      )}
    </section>
  );
}
