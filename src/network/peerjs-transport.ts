import { Peer, type DataConnection } from 'peerjs';
import type { ITransport } from './transport.js';

export class PeerJsTransport implements ITransport {
  readonly peerId: string;
  private readonly peer: Peer;
  private readonly connections = new Map<string, DataConnection>();
  private receiveHandlers: ((fromPeerId: string, data: unknown) => void)[] = [];
  private connectHandlers: ((peerId: string) => void)[] = [];
  private disconnectHandlers: ((peerId: string) => void)[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPongTimes = new Map<string, number>();

  constructor(peer: Peer) {
    this.peer = peer;
    this.peerId = peer.id;
    this.setupIncomingConnectionHandler();
    this.startHeartbeat();
  }

  static async create(peerId?: string): Promise<PeerJsTransport> {
    return new Promise((resolve, reject) => {
      const peer = peerId ? new Peer(peerId) : new Peer();
      peer.on('open', () => {
        resolve(new PeerJsTransport(peer));
      });
      peer.on('error', (err) => {
        reject(err);
      });
    });
  }

  async connect(targetPeerId: string): Promise<void> {
    if (this.connections.has(targetPeerId)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(targetPeerId);
      conn.on('open', () => {
        this.trackConnection(conn);
        resolve();
      });
      conn.on('error', (err) => {
        reject(err);
      });
    });
  }

  send(targetPeerId: string, data: unknown): void {
    const conn = this.connections.get(targetPeerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  broadcast(data: unknown): void {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(data);
      }
    }
  }

  onReceive(handler: (fromPeerId: string, data: unknown) => void): void {
    this.receiveHandlers.push(handler);
  }

  onConnect(handler: (peerId: string) => void): void {
    this.connectHandlers.push(handler);
  }

  onDisconnect(handler: (peerId: string) => void): void {
    this.disconnectHandlers.push(handler);
  }

  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.lastPongTimes.clear();
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.peer.destroy();
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [peerId, conn] of [...this.connections.entries()]) {
        if (!conn.open) continue;

        const lastActive = this.lastPongTimes.get(peerId) ?? now;
        if (now - lastActive >= 6000) {
          // Dead peer detected: 6 seconds with no pong or response
          this.connections.delete(peerId);
          this.lastPongTimes.delete(peerId);
          try {
            conn.close();
          } catch {
            // ignore
          }
          this.disconnectHandlers.forEach((h) => h(peerId));
          continue;
        }

        try {
          conn.send({ __trumps_hb: 'ping' });
        } catch {
          // ignore send failure; conn.on('close') or dead peer check handles cleanup
        }
      }
    }, 3000);
  }

  private setupIncomingConnectionHandler(): void {
    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.trackConnection(conn);
      });
    });
  }

  private trackConnection(conn: DataConnection): void {
    const peerId = conn.peer;
    this.connections.set(peerId, conn);
    this.lastPongTimes.set(peerId, Date.now());

    conn.on('data', (rawData: unknown) => {
      this.lastPongTimes.set(peerId, Date.now());

      if (rawData && typeof rawData === 'object' && '__trumps_hb' in rawData) {
        const hb = (rawData as { __trumps_hb: string }).__trumps_hb;
        if (hb === 'ping') {
          try {
            conn.send({ __trumps_hb: 'pong' });
          } catch {
            // ignore
          }
        }
        return;
      }
      this.receiveHandlers.forEach((h) => h(peerId, rawData));
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      this.lastPongTimes.delete(peerId);
      this.disconnectHandlers.forEach((h) => h(peerId));
    });

    conn.on('error', (err) => {
      console.warn(`DataConnection error with ${peerId}:`, err);
    });

    this.connectHandlers.forEach((h) => h(peerId));
  }
}
