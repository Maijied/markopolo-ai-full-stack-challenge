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

  streamPing(): Observable<SseEvent> {
    // Only create EventSource in the browser
    if (!isPlatformBrowser(this.platformId)) {
      // SSR: return an empty observable
      return new Observable<SseEvent>((observer) => observer.complete());
    }

    const url = `${environment.apiBaseUrl}/sse/ping`;
    const es = new EventSource(url);

    return new Observable<SseEvent>((observer) => {
      const onStatus = (ev: MessageEvent) => {
        this.zone.run(() =>
          observer.next({ type: "status", data: JSON.parse(ev.data) })
        );
      };

      const onTick = (ev: MessageEvent) => {
        this.zone.run(() =>
          observer.next({ type: "tick", data: JSON.parse(ev.data) })
        );
      };

      const onError = (err: any) => {
        this.zone.run(() => observer.error(err));
        es.close();
      };

      es.addEventListener("status", onStatus as EventListener);
      es.addEventListener("tick", onTick as EventListener);
      es.onerror = onError;

      // Cleanup on unsubscribe
      return () => es.close();
    });
  }
}
