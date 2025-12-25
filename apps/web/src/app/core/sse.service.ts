import { Injectable, NgZone, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export type SseEvent<T = any> = {
  type: string;
  data: T;
};

@Injectable({ providedIn: "root" })
export class SseService {
  constructor(
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Existing ping stream
  streamPing(): Observable<SseEvent> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable<SseEvent>((observer) => observer.complete());
    }

    const url = `${environment.apiBaseUrl}/sse/ping`;
    const es = new EventSource(url);

    return new Observable<SseEvent>((observer) => {
      const onStatus = (ev: MessageEvent) =>
        this.zone.run(() =>
          observer.next({ type: "status", data: JSON.parse(ev.data) })
        );

      const onTick = (ev: MessageEvent) =>
        this.zone.run(() =>
          observer.next({ type: "tick", data: JSON.parse(ev.data) })
        );

      es.addEventListener("status", onStatus as EventListener);
      es.addEventListener("tick", onTick as EventListener);

      es.onerror = (err) => {
        this.zone.run(() => observer.error(err));
        es.close();
      };

      return () => es.close();
    });
  }

  // New: stream chat session events
  streamSession(sessionId: string): Observable<SseEvent> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable<SseEvent>((observer) => observer.complete());
    }

    const url = `${environment.apiBaseUrl}/chat/sessions/${sessionId}/stream`;
    const es = new EventSource(url);

    // inside SseService.streamSession
    return new Observable<SseEvent>((observer) => {
      this.zone.runOutsideAngular(() => {
        const onStatus = (ev: MessageEvent) =>
          this.zone.run(() => observer.next({ type: "status", data: JSON.parse(ev.data) }));

        const onSnapshot = (ev: MessageEvent) =>
          this.zone.run(() => observer.next({ type: "snapshot", data: JSON.parse(ev.data) }));

        es.addEventListener("status", onStatus as EventListener);
        es.addEventListener("snapshot", onSnapshot as EventListener);

        es.onerror = (err) => {
          // Don’t always observer.error() here (EventSource may auto-reconnect).
          this.zone.run(() => observer.next({ type: "error", data: err }));
          // optionally keep connection open; only close when you truly want to stop
          // es.close();
        };
      });

      return () => es.close();
    });

  }
}
