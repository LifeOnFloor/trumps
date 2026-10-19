import { describe, it, expect } from 'vitest';
import { MemoryNetworkHub, MemoryTransport } from '../../src/network/memory-transport.js';
import { HostSession } from '../../src/network/host-session.js';
import { ClientSession } from '../../src/network/client-session.js';
import type { DaifugoConfig } from '../../src/core/rules/daifugo/config.js';

describe('Room Config Synchronization', () => {
  it('delivers host custom config to joining client via ROOM_JOINED', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const clientTransport = new MemoryTransport('client-peer', hub);

    const customConfig: Partial<DaifugoConfig> = {
      suitLock: 'geki',
      nineEffect: 'revolution',
      sandstorm: true,
      miyakoOchi: true,
      chipsMode: true,
    };

    const hostSession = new HostSession(hostTransport, { id: 'host-1', name: 'Host' }, { config: customConfig });
    const clientSession = new ClientSession(clientTransport, { id: 'client-1', name: 'Client 1' });

    let receivedConfig: DaifugoConfig | null = null;
    clientSession.onConfigUpdated((conf) => {
      receivedConfig = conf;
    });

    await clientSession.joinRoom('host-peer');

    expect(receivedConfig).not.toBeNull();
    const config = receivedConfig as unknown as DaifugoConfig;
    expect(config.suitLock).toBe('geki');
    expect(config.nineEffect).toBe('revolution');
    expect(config.sandstorm).toBe(true);
    expect(config.miyakoOchi).toBe(true);
    expect(config.chipsMode).toBe(true);
  });

  it('synchronizes host updated config in real-time when host changes rules in lobby', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const clientTransport = new MemoryTransport('client-peer', hub);

    const hostSession = new HostSession(hostTransport, { id: 'host-1', name: 'Host' });
    const clientSession = new ClientSession(clientTransport, { id: 'client-1', name: 'Client 1' });

    let latestClientConfig: DaifugoConfig | null = null;
    clientSession.onConfigUpdated((conf) => {
      latestClientConfig = conf;
    });

    await clientSession.joinRoom('host-peer');

    // Host updates config in lobby
    hostSession.updateConfig({
      suitLock: 'double',
      elevenBack: true,
      sevenPass: true,
    });

    expect(latestClientConfig).not.toBeNull();
    const updated = latestClientConfig as unknown as DaifugoConfig;
    expect(updated.suitLock).toBe('double');
    expect(updated.elevenBack).toBe(true);
    expect(updated.sevenPass).toBe(true);
  });

  it('ensures GAME_STARTED sanitizedState contains host custom config for all clients', async () => {
    const hub = new MemoryNetworkHub();
    const hostTransport = new MemoryTransport('host-peer', hub);
    const client1Transport = new MemoryTransport('client1-peer', hub);
    const client2Transport = new MemoryTransport('client2-peer', hub);

    const hostSession = new HostSession(hostTransport, { id: 'host-1', name: 'Host' });
    const client1 = new ClientSession(client1Transport, { id: 'client-1', name: 'Client 1' });
    const client2 = new ClientSession(client2Transport, { id: 'client-2', name: 'Client 2' });

    await client1.joinRoom('host-peer');
    await client2.joinRoom('host-peer');

    // Host starts game with custom config
    hostSession.startGame({
      suitLock: 'single',
      sandstorm: true,
      eightCut: false,
    });

    expect(client1.getState()?.ruleState.config.suitLock).toBe('single');
    expect(client1.getState()?.ruleState.config.sandstorm).toBe(true);
    expect(client1.getState()?.ruleState.config.eightCut).toBe(false);

    expect(client2.getState()?.ruleState.config.suitLock).toBe('single');
    expect(client2.getState()?.ruleState.config.sandstorm).toBe(true);
    expect(client2.getState()?.ruleState.config.eightCut).toBe(false);
  });
});
