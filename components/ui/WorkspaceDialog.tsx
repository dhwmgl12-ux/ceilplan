"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface WorkspaceDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function WorkspaceDialog({
  open,
  title,
  onClose,
  children,
}: WorkspaceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;

    if (!dialog) return;

    dialog.showModal();

    return () => {
      dialog.close();

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="cp-command-dialog"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 id={titleId} className="cp-title">
          {title}
        </h2>

        <button type="button" onClick={onClose} className="cp-button-secondary">
          닫기
        </button>
      </div>

      <div className="cp-command-dialog-body">{children}</div>
    </dialog>
  );
}
