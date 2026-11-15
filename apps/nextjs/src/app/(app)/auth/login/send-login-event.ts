import type { LoginEvent } from "~/app/api/login/event";

export function sendLoginEvent(event: LoginEvent) {
  navigator.sendBeacon?.("/api/login", JSON.stringify(event));
}
