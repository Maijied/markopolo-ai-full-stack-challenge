import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ConnectionsApiService, Connection } from "../connections-api.service";

type Source = "website" | "shopify" | "crm";

@Component({
  selector: "app-connections-panel",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./connections-panel.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionsPanelComponent implements OnInit {
  // IMPORTANT: typed as literal union array so template variable `s` is Source, not string
  readonly sources: readonly Source[] = ["website", "shopify", "crm"] as const;

  loading = false;

  connections: Record<Source, Connection | null> = {
    website: null,
    shopify: null,
    crm: null,
  };

  constructor(private api: ConnectionsApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.api.list().subscribe({
      next: ({ connections }) => {
        for (const s of this.sources) {
          this.connections[s] = connections.find((c) => c.source === s) ?? null;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error("connections list failed", e);
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  isConnected(source: Source): boolean {
    return this.connections[source]?.status === "connected";
  }

  toggle(source: Source): void {
    const call = this.isConnected(source)
      ? this.api.disconnect(source)
      : this.api.connect(source);

    call.subscribe({
      next: () => this.refresh(),
      error: (e) => console.error("toggle failed", e),
    });
  }
}
