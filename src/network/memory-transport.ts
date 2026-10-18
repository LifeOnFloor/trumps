import type { ITransport } from './transport.js';

export class MemoryNetworkHub {
  private readonly transports = new Map<string, MemoryTransport>();

  register(transport: MemoryTransport): void {
    this.transports.set(transport.peerId, transport);
  }

  unregister(peerId: string): void {
    this.transports.delete(peerId);
  }

  get(peerId: string): MemoryTransport | undefined {
    return this.transports.get(peerId);
  }
}

export class MemoryTransport implements ITransport {
  readonly peerId: string;
  private readonly hub: MemoryNetworkHub;
  private readonly connectedPeers = new Set<string>();
  private receiveHandlers: ((fromPeerId: string, data: unknown) => void)[] = [];
  private connectHandlers: ((peerId: string) => void)[] = [];
  private disconnectHandlers: ((peerId: string) => void)[] = [];

  constructor(peerId: string, hub: MemoryNetworkHub) {
    this.peerId = peerId;
    this.hub = hub;
    this.hub.register(this);
  }

  async connect(targetPeerId: string): Promise<void> {
    const target = this.hub.get(targetPeerId);
    if (!target) {
      throw new Error(`Target peer ${targetPeerId} not found in MemoryNetworkHub`);
    }

    this.connectedPeers.add(targetPeerId);
    target.connectedPeers.add(this.peerId);

    // Notify connect handlers
    this.connectHandlers.forEach((h) => h(targetPeerId));
    target.connectHandlers.forEach((h) => h(this.peerId));
  }

  send(targetPeerId: string, data: unknown): void {
    if (!this.connectedPeers.has(targetPeerId)) {
      return;
    }
    const target = this.hub.get(targetPeerId);
    if (target) {
      const cloned = structuredClone(data);
      target.receiveHandlers.forEach((h) => h(this.peerId, cloned));
    }
  }

  broadcast(data: unknown): void {
    for (const targetId of this.connectedPeers) {
      this.send(targetId, data);
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
    const peers = [...this.connectedPeers];
    for (const targetId of peers) {
      const target = this.hub.get(targetId);
      if (target) {
        target.connectedPeers.delete(this.peerId);
        target.disconnectHandlers.forEach((h) => h(this.peerId));
      }
    }
    this.connectedPeers.clear();
    this.hub.unregister(this.peerId);
  }
}
