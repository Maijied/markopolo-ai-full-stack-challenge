import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { ChatApiService, ChatMessage } from "../../core/chat-api.service";
import { SseService } from "../../core/sse.service";

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

  constructor(private api: ChatApiService, private sse: SseService) {}

  ngOnInit(): void {
    this.api.createSession().subscribe(({ sessionId }) => {
      this.sessionId = sessionId;

      this.sub = this.sse.streamSession(sessionId).subscribe({
        next: (ev) => {
          if (ev.type === "snapshot") {
            this.messages = ev.data.messages ?? [];
          }
        },
        error: (e) => console.error("stream error", e),
      });
    });
  }

  send(): void {
    if (!this.sessionId) return;
    const text = this.input.trim();
    if (!text) return;

    this.input = "";
    this.api.sendMessage(this.sessionId, "user", text).subscribe(() => {
      // Step 6 will push live updates; for now just refetch or rely on snapshot refresh.
      this.api.listMessages(this.sessionId!).subscribe((r) => (this.messages = r.messages));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
