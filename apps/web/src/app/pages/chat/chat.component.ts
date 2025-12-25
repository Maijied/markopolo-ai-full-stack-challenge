import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";

import { ChatApiService, ChatMessage } from "../../core/chat-api.service";
import { SseService } from "../../core/sse.service";
import { CampaignApiService } from "../../core/campaign-api.service";

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./chat.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy {
  sessionId?: string;

  // chat
  messages: ChatMessage[] = [];
  input = "";

  // campaign generator
  campaignPrompt = "Create a winback campaign for churn-risk customers.";
  selectedChannels: string[] = ["email", "sms", "whatsapp", "ads"];
  generating = false;

  // streamed outputs
  draftText = "";
  campaign: any = null;

  private sub?: Subscription;

  constructor(
    private chatApi: ChatApiService,
    private sse: SseService,
    private campaignApi: CampaignApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.chatApi.createSession().subscribe({
      next: ({ sessionId }) => {
        this.sessionId = sessionId;
        this.cdr.markForCheck();

        this.sub = this.sse.streamSession(sessionId).subscribe({
          next: (ev) => {
            if (ev.type === "snapshot") {
              this.messages = ev.data.messages ?? [];
            } else if (ev.type === "message.created") {
              this.messages = [...this.messages, ev.data];
            } else if (ev.type === "draft.delta") {
              this.draftText += ev.data?.text ?? "";
            } else if (ev.type === "campaign.generated") {
              this.campaign = ev.data;
              this.generating = false;
            }
            this.cdr.markForCheck();
          },
          error: (e) => {
            console.error("stream error", e);
            this.cdr.markForCheck();
          },
        });
      },
      error: (e) => {
        console.error("createSession failed", e);
        this.cdr.markForCheck();
      },
    });
  }

  send(): void {
    if (!this.sessionId) return;

    const text = this.input.trim();
    if (!text) return;

    this.input = "";
    this.chatApi.sendMessage(this.sessionId, "user", text).subscribe({
      error: (e) => console.error("sendMessage failed", e),
    });
  }

  toggleChannel(channel: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedChannels.includes(channel)) {
        this.selectedChannels = [...this.selectedChannels, channel];
      }
    } else {
      this.selectedChannels = this.selectedChannels.filter((c) => c !== channel);
    }
    this.cdr.markForCheck();
  }

  generateCampaign(): void {
    if (!this.sessionId) return;

    this.generating = true;
    this.draftText = "";
    this.campaign = null;
    this.cdr.markForCheck();

    this.campaignApi
      .generate(this.sessionId, this.campaignPrompt, this.selectedChannels)
      .subscribe({
        next: () => {
          // generation progress arrives via SSE events
        },
        error: (e) => {
          console.error("generateCampaign failed", e);
          this.generating = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
