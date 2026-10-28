import { vi } from 'vitest';
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

		await vi.waitFor(() => {
			expect(received).toContainEqual(message);
		});
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

	it('rejects starting a closed channel', async () => {
		const { clientChannel, serverChannel } = MessageChannelTransport.createChannelPair();

		await clientChannel.close();
		await expect(clientChannel.start()).rejects.toThrow('closed');
		await serverChannel.close();
	});

	it('reports a message that cannot be parsed', () => {
		const { port, transport } = fakeTransport();
		const onerror = vi.fn<(error: Error) => void>();
		transport.onerror = onerror;

		port.onmessage?.(new MessageEvent('message', { data: { invalid: true } }));

		const [error] = onerror.mock.calls[0];
		expect(error.message).toContain('Error parsing');
	});

	it('reports a message that cannot be deserialised', () => {
		const { port, transport } = fakeTransport();
		const onerror = vi.fn<(error: Error) => void>();
		transport.onerror = onerror;

		port.onmessageerror?.(new MessageEvent('messageerror'));

		const [error] = onerror.mock.calls[0];
		expect(error.message).toContain('deserializing');
	});

	it('reports a message that cannot be posted', async () => {
		const { port, transport } = fakeTransport();
		const onerror = vi.fn();
		transport.onerror = onerror;
		vi.mocked(port.postMessage).mockImplementation(() => {
			throw new Error('post failed');
		});

		await expect(transport.send({ jsonrpc: '2.0', id: 1, method: 'ping' })).rejects.toThrow(
			'Error in posting'
		);
		expect(onerror).toHaveBeenCalled();
	});

	it('clears its handlers and notifies when closed', async () => {
		const { port, transport } = fakeTransport();
		const onclose = vi.fn();
		transport.onclose = onclose;

		await transport.close();

		expect(port.close).toHaveBeenCalled();
		expect(transport.onmessage).toBeUndefined();
		expect(transport.onerror).toBeUndefined();
		expect(onclose).toHaveBeenCalled();
	});

	function fakeTransport() {
		const port = {
			onmessage: null as ((event: MessageEvent) => void) | null,
			onmessageerror: null as ((event: MessageEvent) => void) | null,
			start: vi.fn(),
			close: vi.fn(),
			postMessage: vi.fn()
		};
		const transport = new MessageChannelTransport(port as unknown as MessagePort, 'session');
		return { port, transport };
	}
});
