import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryNetworkHub, MemoryTransport } from '../../src/network/memory-transport.js';

describe('MemoryTransport', () => {
  let hub: MemoryNetworkHub;

  beforeEach(() => {
    hub = new MemoryNetworkHub();
  });

  it('connects between two peers and triggers onConnect', async () => {
    const peer1 = new MemoryTransport('peer1', hub);
    const peer2 = new MemoryTransport('peer2', hub);

    let peer1ConnectedTo = '';
    let peer2ConnectedTo = '';

    peer1.onConnect((pId) => {
      peer1ConnectedTo = pId;
    });
    peer2.onConnect((pId) => {
      peer2ConnectedTo = pId;
    });

    await peer1.connect('peer2');

    expect(peer1ConnectedTo).toBe('peer2');
    expect(peer2ConnectedTo).toBe('peer1');
  });

  it('sends data between connected peers', async () => {
    const peer1 = new MemoryTransport('peer1', hub);
    const peer2 = new MemoryTransport('peer2', hub);

    await peer1.connect('peer2');

    let receivedFrom = '';
    let receivedData: any = null;

    peer2.onReceive((from, data) => {
      receivedFrom = from;
      receivedData = data;
    });

    peer1.send('peer2', { hello: 'world' });

    expect(receivedFrom).toBe('peer1');
    expect(receivedData).toEqual({ hello: 'world' });
  });

  it('broadcasts data to all connected peers', async () => {
    const host = new MemoryTransport('host', hub);
    const client1 = new MemoryTransport('client1', hub);
    const client2 = new MemoryTransport('client2', hub);

    await client1.connect('host');
    await client2.connect('host');

    const received1: any[] = [];
    const received2: any[] = [];

    client1.onReceive((_, data) => received1.push(data));
    client2.onReceive((_, data) => received2.push(data));

    host.broadcast({ msg: 'all' });

    expect(received1).toEqual([{ msg: 'all' }]);
    expect(received2).toEqual([{ msg: 'all' }]);
  });

  it('notifies disconnect on close', async () => {
    const peer1 = new MemoryTransport('peer1', hub);
    const peer2 = new MemoryTransport('peer2', hub);

    await peer1.connect('peer2');

    let disconnectedPeer = '';
    peer2.onDisconnect((pId) => {
      disconnectedPeer = pId;
    });

    peer1.close();

    expect(disconnectedPeer).toBe('peer1');
  });
});
