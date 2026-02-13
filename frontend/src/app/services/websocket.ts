import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject } from 'rxjs';
import { share } from 'rxjs/operators';

export interface WSMessage { type: string, data?: any }

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private socket$?: WebSocketSubject<WSMessage>;
  private reconnectDelay = 3000;
  private messageQueue: WSMessage[] = [];

  private incoming$ = new Subject<WSMessage>();
  public messages$ = this.incoming$.asObservable().pipe(share());

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/api/ws`;
  }

  private createSocket(): WebSocketSubject<WSMessage> {
    const socket = webSocket<WSMessage>({
      url: this.getWebSocketUrl(),
      deserializer: msg => JSON.parse(msg.data),
      openObserver: { next: () => this.onOpen() },
      closeObserver: { next: () => this.onClose() },
    });
    return socket;
  }

  connect() {
    if (!this.socket$) {
      this.socket$ = this.createSocket();

      this.socket$.subscribe({
        next: msg => {
          if (msg?.type === 'ping') {
            console.log('Received ping, sending pong');
            this.send({ type: 'pong', data: msg?.data });
          } else {
            this.incoming$.next(msg);
          }
        },
        error: _err => {
            console.error('WebSocket error');
            this.socket$ = undefined;
        },
        complete: () => {
            console.log('WebSocket closed');
        }
      });
    }
  }

  private onOpen() {
    console.log(`WebSocket ${this.getWebSocketUrl()} connected`);
    while (this.messageQueue.length) {
      this.socket$?.next(this.messageQueue.shift()!);
    }
  }

  private onClose() {
    console.warn(`WebSocket closed, reconnecting in ${this.reconnectDelay / 1000}s`);
    this.socket$ = undefined;
    setTimeout(() => this.connect(), this.reconnectDelay);
  }

  public send(msg: WSMessage) {
    if (!this.socket$) {
      this.messageQueue.push(msg);
      this.connect();
    } else {
      this.socket$.next(msg);
    }
  }

  public close() {
    this.socket$?.complete();
    this.socket$ = undefined;
  }
}
