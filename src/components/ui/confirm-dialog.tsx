"use client";

import * as React from "react";
import { create } from "zustand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmStore = {
  pending: PendingConfirm | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  resolve: (value: boolean) => void;
};

const useConfirmStore = create<ConfirmStore>((set, get) => ({
  pending: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      // If one is already open, auto-resolve it to false before replacing.
      const existing = get().pending;
      if (existing) existing.resolve(false);
      set({ pending: { ...options, resolve } });
    }),
  resolve: (value) => {
    const pending = get().pending;
    if (pending) {
      pending.resolve(value);
      set({ pending: null });
    }
  },
}));

/**
 * Promise-returning confirm dialog.
 *
 * ```ts
 * const confirm = useConfirm();
 * const ok = await confirm({
 *   title: "Delete lead?",
 *   description: "This cannot be undone.",
 *   confirmLabel: "Delete",
 *   tone: "destructive",
 * });
 * if (!ok) return;
 * ```
 */
export function useConfirm() {
  return useConfirmStore((s) => s.open);
}

/**
 * Mount once at the root of the dashboard layout so any descendant can call
 * `useConfirm()`. Intentionally stateless — all state lives in the zustand
 * store above.
 */
export function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending);
  const resolve = useConfirmStore((s) => s.resolve);

  const open = pending !== null;
  const confirmLabel = pending?.confirmLabel ?? "Confirm";
  const cancelLabel = pending?.cancelLabel ?? "Cancel";
  const tone = pending?.tone ?? "default";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resolve(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pending?.title ?? ""}</DialogTitle>
          {pending?.description && (
            <DialogDescription>{pending.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => resolve(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={() => resolve(true)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
