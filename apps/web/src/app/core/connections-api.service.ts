import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { Observable } from "rxjs";

export type Connection = {
  id: string;
  source: "website" | "shopify" | "crm";
  status: "connected" | "disconnected";
  metadata: any;
  created_at: string;
};

@Injectable({ providedIn: "root" })
export class ConnectionsApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<{ connections: Connection[] }> {
    return this.http.get<{ connections: Connection[] }>(`${this.base}/connections`);
  }

  connect(source: "website" | "shopify" | "crm"): Observable<any> {
    return this.http.post(`${this.base}/connections/${source}/connect`, { metadata: {} });
  }

  disconnect(source: "website" | "shopify" | "crm"): Observable<any> {
    return this.http.post(`${this.base}/connections/${source}/disconnect`, {});
  }
}
