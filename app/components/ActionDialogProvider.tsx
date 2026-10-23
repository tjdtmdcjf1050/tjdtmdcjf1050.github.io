"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useModalFocus } from "../use-modal-focus";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PromptOptions = ConfirmOptions & {
  defaultValue?: string;
  inputLabel: string;
  maxLength?: number;
};

type DialogState =
  | ({ kind: "confirm" } & ConfirmOptions)
  | ({ kind: "prompt" } & PromptOptions)
  | null;

type DialogApi = {
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
  promptAction: (options: PromptOptions) => Promise<string | null>;
};

const ActionDialogContext = createContext<DialogApi | null>(null);

export function useActionDialog() {
  const context = useContext(ActionDialogContext);
  if (!context)
    throw new Error("useActionDialog must be used inside ActionDialogProvider");
  return context;
}

export default function ActionDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [value, setValue] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const resolver = useRef<((result: boolean | string | null) => void) | null>(null);

  const finish = useCallback((result: boolean | string | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  const close = useCallback(
    () => finish(dialog?.kind === "confirm" ? false : null),
    [dialog?.kind, finish],
  );
  useModalFocus(Boolean(dialog), panelRef, close);

  const confirmAction = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve as (result: boolean | string | null) => void;
      setDialog({ kind: "confirm", ...options });
    });
  }, []);

  const promptAction = useCallback((options: PromptOptions) => {
    resolver.current?.(null);
    setValue(options.defaultValue || "");
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve as (result: boolean | string | null) => void;
      setDialog({ kind: "prompt", ...options });
    });
  }, []);

  return (
    <ActionDialogContext.Provider value={{ confirmAction, promptAction }}>
      {children}
      {dialog && (
        <div
          className="action-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            ref={panelRef}
            className="action-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-dialog-title"
            aria-describedby="action-dialog-description"
          >
            <h2 id="action-dialog-title">{dialog.title}</h2>
            <p id="action-dialog-description">{dialog.message}</p>
            {dialog.kind === "prompt" && (
              <label>
                <span>{dialog.inputLabel}</span>
                <input
                  value={value}
                  maxLength={dialog.maxLength || 120}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && value.trim()) {
                      event.preventDefault();
                      finish(value.trim());
                    }
                  }}
                />
              </label>
            )}
            <div className="action-dialog-actions">
              <button type="button" onClick={close}>
                {dialog.cancelLabel || "취소"}
              </button>
              <button
                type="button"
                className={dialog.danger ? "is-danger" : "is-primary"}
                disabled={dialog.kind === "prompt" && !value.trim()}
                onClick={() =>
                  finish(dialog.kind === "prompt" ? value.trim() : true)
                }
              >
                {dialog.confirmLabel || "확인"}
              </button>
            </div>
          </section>
        </div>
      )}
    </ActionDialogContext.Provider>
  );
}
