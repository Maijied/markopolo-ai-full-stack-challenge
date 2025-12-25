import { Component, OnDestroy, OnInit, ChangeDetectorRef } from "@angular/core";
import { Subscription } from "rxjs";
import { SseService, SseEvent } from "../../core/sse.service";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-sse-demo",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./sse-demo.component.html",
  styleUrls: ["./sse-demo.component.scss"],
})
export class SseDemoComponent implements OnInit, OnDestroy {
  events: SseEvent[] = [];
  private sub?: Subscription;

  constructor(private sse: SseService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (typeof window !== "undefined") {
      this.sub = this.sse.streamPing().subscribe({
        next: (ev) => {
          this.events = [ev, ...this.events].slice(0, 20);
          this.cd.detectChanges(); // Force Angular to check for changes
        },
        error: (e) => console.error("SSE error", e),
      });
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
