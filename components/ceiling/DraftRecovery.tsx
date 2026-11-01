"use client";

import { useEffect, useRef, useState } from "react";
import { parseDraft, replaceDraft, serializeDraft } from "@/lib/draft-storage";

interface DraftRecoveryProps<T> {
  storageKey: string;
  dirty: boolean;
  compact?: boolean;
  readData: () => T;
  normalize: (value: unknown) => T;
  onRecover: (data: T) => void;
}

interface DraftState {
  ready: boolean;
  blocked: boolean;
  raw: string | null;
  lastData: string | null;
  owned: boolean;
}

export default function DraftRecovery<T>({
  storageKey,
  dirty,
  readData,
  normalize,
  onRecover,
  compact = false,
}: DraftRecoveryProps<T>) {
  const latest = useRef({
    dirty,
    readData,
    normalize,
    onRecover,
  });

  const state = useRef<DraftState>({
    ready: false,
    blocked: true,
    raw: null,
    lastData: null,
    owned: false,
  });

  const [pending, setPending] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    latest.current = {
      dirty,
      readData,
      normalize,
      onRecover,
    };
  }, [dirty, readData, normalize, onRecover]);

  useEffect(() => {
    state.current = {
      ready: false,
      blocked: true,
      raw: null,
      lastData: null,
      owned: false,
    };

    function showError(caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "자동 임시저장에 실패했습니다.",
      );
    }

    function initialize() {
      try {
        const raw = localStorage.getItem(storageKey);

        state.current.raw = raw;
        state.current.ready = true;
        state.current.blocked = raw !== null;

        if (raw !== null) {
          setPending(true);

          // 손상된 데이터도 자동으로 삭제하거나 덮어쓰지 않습니다.
          const draft = parseDraft(raw, latest.current.normalize);
          setSavedAt(draft.savedAt);
        }
      } catch (caught) {
        state.current.blocked = true;
        showError(caught);
      }
    }

    function flush() {
      const current = state.current;

      if (!current.ready || current.blocked) return;

      try {
        if (!latest.current.dirty) {
          // 이 화면에서 생성·복구한 임시본만 정리합니다.
          if (current.owned && current.raw !== null) {
            replaceDraft(storageKey, current.raw, null);

            current.raw = null;
            current.owned = false;
            current.lastData = null;

            setSavedAt(null);
            setMessage("현재 작업의 임시저장본을 정리했습니다.");
          }

          return;
        }

        const data = latest.current.normalize(latest.current.readData());

        const serializedData = JSON.stringify(data);

        if (serializedData === current.lastData) return;

        const timestamp = new Date().toISOString();
        const raw = serializeDraft(data, timestamp);

        replaceDraft(storageKey, current.raw, raw);

        current.raw = raw;
        current.lastData = serializedData;
        current.owned = true;

        setSavedAt(timestamp);
        setMessage("작업 내용을 임시저장했습니다.");
        setError("");
      } catch (caught) {
        current.blocked = true;
        showError(caught);
      }
    }

    // 첫 화면 렌더링 이후 브라우저 저장소를 확인합니다.
    const initialization = window.setTimeout(initialize, 0);
    const timer = window.setInterval(flush, 1000);

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);

    return () => {
      window.clearTimeout(initialization);
      window.clearInterval(timer);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);

      // 일반적인 화면 이동 시에도 마지막 적용 내용을 저장합니다.
      flush();
    };
  }, [storageKey]);

  function recover() {
    try {
      const current = state.current;

      if (current.raw === null) {
        throw new Error("복구할 임시저장본이 없습니다.");
      }

      if (localStorage.getItem(storageKey) !== current.raw) {
        throw new Error(
          "임시저장본이 다른 탭에서 변경되었습니다. 새로고침 후 확인하세요.",
        );
      }

      const draft = parseDraft(current.raw, latest.current.normalize);

      if (
        latest.current.dirty &&
        !window.confirm(
          "현재 입력을 임시저장본으로 바꿀까요? 현재 입력은 사라집니다.",
        )
      ) {
        return;
      }

      latest.current.onRecover(structuredClone(draft.data));

      current.blocked = false;
      current.lastData = null;
      current.owned = true;

      setPending(false);
      setError("");
      setMessage("작업을 복구했습니다. 내용을 확인하고 수동 저장하세요.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "작업을 복구하지 못했습니다.",
      );
    }
  }

  function discard() {
    if (!window.confirm("임시저장본을 삭제할까요? 수동 저장본은 유지됩니다.")) {
      return;
    }

    try {
      const current = state.current;

      replaceDraft(storageKey, current.raw, null);

      current.ready = true;
      current.blocked = false;
      current.raw = null;
      current.lastData = null;
      current.owned = false;

      setPending(false);
      setSavedAt(null);
      setError("");
      setMessage("임시저장본을 삭제했습니다.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "임시저장본을 삭제하지 못했습니다.",
      );
    }
  }

  if (compact && !pending && !error) {
    return (
      <div className="min-w-0 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-slate-600">복구용 임시저장</span>

          {savedAt ? (
            <time dateTime={savedAt}>
              마지막 저장{" "}
              {new Date(savedAt).toLocaleTimeString("ko-KR", {
                timeZone: "Asia/Seoul",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </time>
          ) : (
            <span>{dirty ? "임시저장 대기" : "현재 작업의 임시본 없음"}</span>
          )}
        </div>

        <details className="mt-1">
          <summary className="cursor-pointer">
            임시저장 범위와 처리 안내
          </summary>

          <p className="mt-2 max-w-xl leading-5">
            적용된 입력과 마지막 계산 결과를 이 브라우저에 임시 보관합니다. 수정
            적용 전 입력, 드래그 중 위치, 도면 배경 이미지는 복구하지 않습니다.
            프로젝트 수동 저장과 JSON 백업은 별도입니다.
          </p>

          {message && (
            <p role="status" className="mt-1 leading-5">
              {message}
            </p>
          )}
        </details>
      </div>
    );
  }

  return (
    <section
      aria-label="자동 임시저장과 작업 복구"
      className={`rounded-lg border px-4 py-3 ${
        pending || error
          ? "border-amber-200 bg-amber-50"
          : "border-[var(--cp-border)] bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          {pending
            ? "복구할 이전 작업이 있습니다"
            : error
              ? "임시저장 확인 필요"
              : "자동 임시저장"}
        </p>

        {savedAt && (
          <time dateTime={savedAt} className="text-[11px] text-slate-500">
            {new Date(savedAt).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </time>
        )}
      </div>

      {pending ? (
        <>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            이전 작업을 복구하거나 임시본을 삭제하세요. 선택하기 전에는 새
            작업으로 임시본을 덮어쓰지 않습니다. 수동 저장한 프로젝트는 별도로
            유지됩니다.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={recover}
              className="cp-button-primary"
            >
              이전 작업 복구
            </button>

            <button
              type="button"
              onClick={discard}
              className="cp-button-secondary"
            >
              임시본 삭제
            </button>
          </div>
        </>
      ) : (
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {dirty
            ? "미저장 변경사항이 있습니다. 임시저장 여부와 별개로 프로젝트를 수동 저장하세요."
            : "현재 작업의 미저장 변경사항이 없습니다."}
        </p>
      )}

      {message && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-[11px] leading-5 text-slate-600"
        >
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs leading-5 text-red-700">
          {error}
        </p>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-slate-500">
          임시저장 범위
        </summary>

        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          적용된 입력과 마지막 계산 결과를 임시 보관합니다. 수정 적용 전 입력,
          드래그 중 위치, 도면 배경 이미지는 복구 대상이 아닙니다. 복구한 계산
          결과는 다시 계산한 뒤 사용하세요. 다른 기기와 동기화되지 않으며 JSON
          백업을 대신하지 않습니다.
        </p>
      </details>
    </section>
  );
}
