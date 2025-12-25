import { Component, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ConnectionsPanelComponent } from "./core/connections-panel/connections-panel.component";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, ConnectionsPanelComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.scss",
})
export class App {
  protected readonly title = signal("web");
}
