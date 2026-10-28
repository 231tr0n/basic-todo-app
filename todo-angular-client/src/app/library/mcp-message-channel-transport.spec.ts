import { MessageChannelTransport } from './mcp-message-channel-transport';

describe('MessageChannelTransport', () => {
	it('delivers messages between the paired channels', async () => {
		const { clientChannel, serverChannel } = MessageChannelTransport.createChannelPair();
		const received: unknown[] = [];
		serverChannel.onmessage = (message) => received.push(message);

		await clientChannel.start();
		await serverChannel.start();
		const message = { jsonrpc: '2.0', id: 1, method: 'ping' } as const;
		await clientChannel.send(message);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(received).toContainEqual(message);
		await clientChannel.close();
		await serverChannel.close();
	});

	it('rejects sends after close and can be closed more than once', async () => {
		const { clientChannel, serverChannel } = MessageChannelTransport.createChannelPair();

		await clientChannel.close();
		await clientChannel.close();

		await expect(clientChannel.send({ jsonrpc: '2.0', id: 1, method: 'ping' })).rejects.toThrow(
			'closed'
		);
		await serverChannel.close();
	});

	it('rejects starting a channel twice', async () => {
		const { clientChannel, serverChannel } = MessageChannelTransport.createChannelPair();

		await clientChannel.start();
		await expect(clientChannel.start()).rejects.toThrow('started');
		await clientChannel.close();
		await serverChannel.close();
	});
});
