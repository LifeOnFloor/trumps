import { Peer, type DataConnection } from 'peerjs';
import type { ITransport } from './transport.js';

export class PeerJsTransport implements ITransport {
  readonly peerId: string;
  private readonly peer: Peer;
  private readonly connections = new Map<string, DataConnection>();
  private receiveHandlers: ((fromPeerId: string, data: unknown) => void)[] = [];
  private connectHandlers: ((peerId: string) => void)[] = [];
  private disconnectHandlers: ((peerId: string) => void)[] = [];

  constructor(peer: Peer) {
    this.peer = peer;
    this.peerId = peer.id;
    this.setupIncomingConnectionHandler();
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
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.peer.destroy();
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

    conn.on('data', (data) => {
      this.receiveHandlers.forEach((h) => h(peerId, data));
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      this.disconnectHandlers.forEach((h) => h(peerId));
    });

    conn.on('error', () => {
      this.connections.delete(peerId);
      this.disconnectHandlers.forEach((h) => h(peerId));
    });

    this.connectHandlers.forEach((h) => h(peerId));
  }
}
