import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { ChatApiService, ChatMessage } from "../../core/chat-api.service";
import { SseService } from "../../core/sse.service";
import { ChangeDetectorRef } from "@angular/core";

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./chat.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  sessionId?: string;
  messages: ChatMessage[] = [];
  input = "";
  private sub?: Subscription;

  constructor(
    private api: ChatApiService,
    private sse: SseService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.api.createSession().subscribe({
      next: ({ sessionId }) => {
        this.sessionId = sessionId;
        this.cdr.markForCheck();

        this.sub = this.sse.streamSession(sessionId).subscribe({
          next: (ev) => {
            if (ev.type === "snapshot") this.messages = ev.data.messages ?? [];
            if (ev.type === "message.created") this.messages = [...this.messages, ev.data];
            this.cdr.markForCheck();
          },
          error: (e) => {
            console.error("stream error", e);
            this.cdr.markForCheck();
          }
        });
      },
      error: (e) => {
        console.error("createSession failed", e);
        this.cdr.markForCheck();
      }
    });
  }

  send(): void {
    if (!this.sessionId) return;
    const text = this.input.trim();
    if (!text) return;

    this.input = "";
    this.api.sendMessage(this.sessionId, "user", text).subscribe();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
