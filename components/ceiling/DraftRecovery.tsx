"use client";

import { useEffect, useRef, useState } from "react";
import { parseDraft, replaceDraft, serializeDraft } from "@/lib/draft-storage";

interface DraftRecoveryProps<T> {
  storageKey: string;
  dirty: boolean;
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

  return (
    <section
      aria-label="자동 임시저장과 작업 복구"
      className="rounded-xl border border-blue-100 bg-blue-50 p-4"
    >
      <p className="text-sm font-semibold text-blue-900">
        {pending ? "이전 작업의 임시저장본이 있습니다." : "자동 임시저장"}
      </p>

      {savedAt && (
        <p className="mt-2 text-xs text-slate-600">
          임시저장 시각: {new Date(savedAt).toLocaleString("ko-KR")}
        </p>
      )}

      <p className="mt-2 text-xs leading-5 text-slate-600">
        적용된 입력만 저장합니다. 임시저장은 수동 저장이나 JSON 백업을 대신하지
        않습니다.
      </p>

      {pending && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={recover} className="cp-button-primary">
            이전 작업 복구
          </button>

          <button
            type="button"
            onClick={discard}
            className="cp-button-secondary"
          >
            임시저장본 삭제
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="mt-3 text-xs text-blue-800">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
