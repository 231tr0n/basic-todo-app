import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppConfiguration } from '../config/app-configuration';
import { TodoMcpClient } from './todo-mcp-client';

const sdkMock = vi.hoisted(() => ({
	clients: [] as {
		connect: ReturnType<typeof vi.fn>;
		close: ReturnType<typeof vi.fn>;
		listTools: ReturnType<typeof vi.fn>;
		callTool: ReturnType<typeof vi.fn>;
	}[],
	transports: [] as { url: URL; options: unknown }[],
	connectImpl: undefined as (() => Promise<void>) | undefined
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
	Client: class {
		connect = vi.fn(() => sdkMock.connectImpl?.() ?? Promise.resolve());
		close = vi.fn().mockResolvedValue(undefined);
		listTools = vi.fn();
		callTool = vi.fn();

		constructor() {
			sdkMock.clients.push(this);
		}
	}
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
	StreamableHTTPClientTransport: class {
		readonly kind = 'transport';

		constructor(url: URL, options: unknown) {
			sdkMock.transports.push({ url, options });
		}
	}
}));

describe('TodoMcpClient', () => {
	let service: TodoMcpClient;

	beforeEach(() => {
		sdkMock.clients.length = 0;
		sdkMock.transports.length = 0;
		sdkMock.connectImpl = undefined;
		TestBed.configureTestingModule({
			providers: [
				{
					provide: AppConfiguration,
					useValue: {
						mcpEndpoint: '/mcp',
						mcpClientName: 'client',
						mcpClientVersion: '1.0.0'
					}
				}
			]
		});
		service = TestBed.inject(TodoMcpClient);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it('connects over the configured MCP endpoint with cookies', async () => {
		await service.connect();

		const client = lastClient();
		const transport = lastTransport();
		expect(transport.url.pathname).toBe('/mcp');
		expect(transport.options).toEqual({ requestInit: { credentials: 'include' } });
		expect(client.connect).toHaveBeenCalledTimes(1);
	});

	it('reuses the connected client', async () => {
		await service.connect();
		await service.connect();

		expect(sdkMock.clients).toHaveLength(1);
	});

	it('shares one connection between concurrent callers', async () => {
		const pending = deferred();
		sdkMock.connectImpl = () => pending.promise;

		const first = service.connect();
		const second = service.connect();
		pending.resolve();
		await Promise.all([first, second]);

		expect(sdkMock.clients).toHaveLength(1);
	});

	it('closes the client and reconnects afterwards', async () => {
		await service.connect();
		const first = lastClient();

		await service.close();
		expect(first.close).toHaveBeenCalled();

		await service.connect();
		expect(sdkMock.clients).toHaveLength(2);
	});

	it('rejects a connection that was closed while connecting', async () => {
		const pending = deferred();
		sdkMock.connectImpl = () => pending.promise;

		const connecting = service.connect();
		const closing = service.close();
		pending.resolve();

		await expect(connecting).rejects.toThrow('closed while connecting');
		await closing;
	});

	it('closes the client when connecting fails', async () => {
		const pending = deferred();
		sdkMock.connectImpl = () => pending.promise;

		const connecting = service.connect();
		const client = lastClient();
		pending.reject(new Error('offline'));

		await expect(connecting).rejects.toThrow('offline');
		expect(client.close).toHaveBeenCalled();
	});

	it('lists tools and calls tools through the client', async () => {
		const tools = [{ name: 'get_todos', inputSchema: { type: 'object' } }];
		const result = { content: [{ type: 'text', text: '[]' }] };
		await service.connect();
		const client = lastClient();
		client.listTools.mockResolvedValue({ tools });
		client.callTool.mockResolvedValue(result);

		await expect(service.listTools()).resolves.toEqual(tools);
		await expect(service.callTool('get_todos', { id: 1 })).resolves.toEqual(result);
		expect(client.callTool).toHaveBeenCalledWith({
			name: 'get_todos',
			arguments: { id: 1 }
		});
	});

	function lastClient(): (typeof sdkMock.clients)[number] {
		const client = sdkMock.clients.at(-1);
		if (!client) throw new Error('No client was created');
		return client;
	}

	function lastTransport(): (typeof sdkMock.transports)[number] {
		const transport = sdkMock.transports.at(-1);
		if (!transport) throw new Error('No transport was created');
		return transport;
	}

	function deferred(): {
		promise: Promise<void>;
		resolve: () => void;
		reject: (reason: unknown) => void;
	} {
		let resolve: () => void = () => undefined;
		let reject: (reason: unknown) => void = () => undefined;
		const promise = new Promise<void>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		return { promise, resolve, reject };
	}
});
