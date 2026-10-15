export interface EditorHistory<T> {
  past: T[];
  present: T;
  future: T[];
}

export type EditorHistoryAction<T> =
  | {
      type: "change";
      update: (previous: T) => T;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

// 메모리 사용을 제한하는 편집 이력 개수입니다.
// 시공 또는 계산 기준이 아닙니다.
const HISTORY_LIMIT = 100;

export function createEditorHistory<T>(value: T): EditorHistory<T> {
  return {
    past: [],
    present: structuredClone(value),
    future: [],
  };
}

export function editorHistoryReducer<T>(
  state: EditorHistory<T>,
  action: EditorHistoryAction<T>,
): EditorHistory<T> {
  switch (action.type) {
    case "change": {
      // update 함수는 원본을 수정하지 않는 순수 함수여야 합니다.
      const next = action.update(state.present);

      if (JSON.stringify(next) === JSON.stringify(state.present)) {
        return state;
      }

      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    }

    case "undo": {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];

      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;

      const next = state.future[0];

      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: state.future.slice(1),
      };
    }

    case "reset":
      return createEditorHistory(action.value);
  }
}
