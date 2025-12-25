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
  ) { }

  streamPing(): Observable<SseEvent> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable<SseEvent>((observer) => observer.complete());
    }

    const url = `${environment.apiBaseUrl}/sse/ping`;

    return new Observable<SseEvent>((observer) => {
      const es = new EventSource(url);

      this.zone.runOutsideAngular(() => {
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
          // Non-fatal: browsers may reconnect automatically.
          this.zone.run(() => observer.next({ type: "error", data: err }));
        };
      });

      return () => es.close();
    });
  }

  streamSession(sessionId: string): Observable<SseEvent> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable<SseEvent>((observer) => observer.complete());
    }

    const url = `${environment.apiBaseUrl}/chat/sessions/${sessionId}/stream`;

    return new Observable<SseEvent>((observer) => {
      const es = new EventSource(url);

      this.zone.runOutsideAngular(() => {
        const onStatus = (ev: MessageEvent) =>
          this.zone.run(() =>
            observer.next({ type: "status", data: JSON.parse(ev.data) })
          );

        const onSnapshot = (ev: MessageEvent) =>
          this.zone.run(() =>
            observer.next({ type: "snapshot", data: JSON.parse(ev.data) })
          );

        const onMessageCreated = (ev: MessageEvent) =>
          this.zone.run(() =>
            observer.next({ type: "message.created", data: JSON.parse(ev.data) })
          );


        es.addEventListener("status", onStatus as EventListener);
        es.addEventListener("snapshot", onSnapshot as EventListener);
        es.addEventListener("message.created", onMessageCreated as EventListener);

        const onDraftDelta = (ev: MessageEvent) =>
          this.zone.run(() =>
            observer.next({ type: "draft.delta", data: JSON.parse(ev.data) })
          );

        const onCampaignGenerated = (ev: MessageEvent) =>
          this.zone.run(() =>
            observer.next({ type: "campaign.generated", data: JSON.parse(ev.data) })
          );

        es.addEventListener("draft.delta", onDraftDelta as EventListener);
        es.addEventListener("campaign.generated", onCampaignGenerated as EventListener);

        es.onerror = (err) => {
          // Non-fatal: don't observer.error() or close here.
          this.zone.run(() => observer.next({ type: "error", data: err }));
        };
      });

      return () => es.close();
    });
  }
}
