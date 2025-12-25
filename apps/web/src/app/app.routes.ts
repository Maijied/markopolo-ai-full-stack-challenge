import { Routes } from "@angular/router";
import { SseDemoComponent } from "./pages/sse-demo/sse-demo.component";
import { ChatComponent } from "./pages/chat/chat.component";

export const routes: Routes = [
  { path: "", component: ChatComponent },
  { path: "demo", component: SseDemoComponent },
];
