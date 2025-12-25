import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

@Injectable({ providedIn: "root" })
export class ChatApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  createSession(): Observable<{ sessionId: string }> {
    return this.http.post<{ sessionId: string }>(`${this.base}/chat/sessions`, {});
  }

  sendMessage(sessionId: string, role: ChatRole, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/chat/sessions/${sessionId}/messages`, { role, content });
  }

  listMessages(sessionId: string): Observable<{ sessionId: string; messages: ChatMessage[] }> {
    return this.http.get<{ sessionId: string; messages: ChatMessage[] }>(`${this.base}/chat/sessions/${sessionId}/messages`);
  }
}
