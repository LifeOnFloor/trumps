export interface ITransport {
  readonly peerId: string;
  connect(targetPeerId: string): Promise<void>;
  send(targetPeerId: string, data: unknown): void;
  broadcast(data: unknown): void;
  onReceive(handler: (fromPeerId: string, data: unknown) => void): void;
  onConnect(handler: (peerId: string) => void): void;
  onDisconnect(handler: (peerId: string) => void): void;
  close(): void;
}
