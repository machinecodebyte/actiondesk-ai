"use client";

import { useEffect } from "react";

export type KeyboardShortcut = {
  key: string;
  meta?: boolean;
  handler: () => void;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const metaMatches = shortcut.meta ? event.metaKey || event.ctrlKey : true;

        if (metaMatches && event.key.toLowerCase() === shortcut.key.toLowerCase()) {
          event.preventDefault();
          shortcut.handler();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
