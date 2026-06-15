"use client";

export function notifyAuthSessionChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("actiondesk-auth-session-changed"));
}
