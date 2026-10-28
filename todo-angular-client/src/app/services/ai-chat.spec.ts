import { TestBed } from '@angular/core/testing';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { vi } from 'vitest';
import { AppConfiguration } from '../config/app-configuration';
import { AiChat } from './ai-chat';
import { TodoMcpClient } from './todo-mcp-client';
import { UiMcpServer } from './ui-mcp-server';

const openaiMock = vi.hoisted(() => ({
	instances: [] as {
		models: { list: ReturnType<typeof vi.fn> };
		chat: { completions: { create: ReturnType<typeof vi.fn> } };
	}[]
}));

vi.mock('openai', () => ({
	OpenAI: class {
		models = { list: vi.fn() };
		chat = { completions: { create: vi.fn() } };

		constructor() {
			openaiMock.instances.push(this);
		}
	}
}));

interface MockClient {
	connect: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	listTools: ReturnType<typeof vi.fn>;
	callTool: ReturnType<typeof vi.fn>;
}

interface OpenAiStub {
	models: { list: ReturnType<typeof vi.fn> };
	chat: { completions: { create: ReturnType<typeof vi.fn> } };
}

describe('AiChat', () => {
	let chat: AiChat;
	let todoMcp: MockClient;
	let uiMcp: MockClient;
	let openai: OpenAiStub;
	let configuration: {
		aiBaseUrl: string;
		aiApiKey: string;
		aiTemperature: number;
		maxToolIterations: number;
	};

	beforeEach(() => {
		openaiMock.instances.length = 0;
		todoMcp = {
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			listTools: vi.fn().mockResolvedValue([]),
			callTool: vi.fn()
		};
		uiMcp = {
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			listTools: vi.fn().mockResolvedValue([]),
			callTool: vi.fn()
		};
		configuration = {
			aiBaseUrl: 'http://localhost/api/ai',
			aiApiKey: 'ollama',
			aiTemperature: 0.2,
			maxToolIterations: 3
		};

		TestBed.configureTestingModule({
			providers: [
				{ provide: AppConfiguration, useValue: configuration },
				{ provide: TodoMcpClient, useValue: todoMcp },
				{ provide: UiMcpServer, useValue: uiMcp }
			]
		});
		chat = TestBed.inject(AiChat);
		openai = last(openaiMock.instances);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it('connects both MCP clients when initialized', async () => {
		await chat.initialize();

		expect(todoMcp.connect).toHaveBeenCalled();
		expect(uiMcp.connect).toHaveBeenCalled();
	});

	it('rejects initialization that was closed halfway', async () => {
		let resolveConnect: () => void = () => undefined;
		todoMcp.connect.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveConnect = resolve;
			})
		);

		const initializing = chat.initialize();
		await chat.dispose();
		resolveConnect();

		await expect(initializing).rejects.toThrow('closed while initializing');
	});

	it('closes both MCP clients when disposed', async () => {
		await chat.initialize();
		await chat.dispose();

		expect(todoMcp.close).toHaveBeenCalled();
		expect(uiMcp.close).toHaveBeenCalled();
	});

	it('lists the available models', async () => {
		openai.models.list.mockResolvedValue({ data: [{ id: 'first' }, { id: 'second' }] });

		await expect(chat.listModels()).resolves.toEqual(['first', 'second']);
	});

	it('groups the available tools by MCP server', async () => {
		const todoTool = { name: 'get_todos', description: 'List', inputSchema: { type: 'object' } };
		const uiTool = { name: 'ui_ask_text', description: 'Ask', inputSchema: { type: 'object' } };
		todoMcp.listTools.mockResolvedValue([todoTool]);
		uiMcp.listTools.mockResolvedValue([uiTool]);

		await expect(chat.listToolGroups()).resolves.toEqual([
			{ server: 'Todo MCP server', tools: [todoTool] },
			{ server: 'UI MCP server', tools: [uiTool] }
		]);
	});

	it('runs a request without tool calls', async () => {
		const assistant: ChatCompletionMessageParam = { role: 'assistant', content: 'Hello' };
		openai.chat.completions.create.mockResolvedValue({ choices: [{ message: assistant }] });
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		expect(received).toEqual([assistant]);
		expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
	});

	it('runs backend tools and sends their output back to the model', async () => {
		const toolCall = {
			id: 'call-1',
			type: 'function',
			function: { name: 'get_todos', arguments: '{"limit":5}' }
		};
		openai.chat.completions.create
			.mockResolvedValueOnce({
				choices: [{ message: { role: 'assistant', content: null, tool_calls: [toolCall] } }]
			})
			.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Done' } }] });
		todoMcp.listTools.mockResolvedValue([
			{ name: 'get_todos', description: 'List todos', inputSchema: { type: 'object' } }
		]);
		todoMcp.callTool.mockResolvedValue({ content: [{ type: 'text', text: '[]' }] });
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		expect(todoMcp.callTool).toHaveBeenCalledWith('get_todos', { limit: 5 });
		expect(received).toHaveLength(3);
		expect(received[1]).toEqual({
			role: 'tool',
			tool_call_id: 'call-1',
			content: '[]'
		});
	});

	it('runs UI tools through the UI MCP server', async () => {
		const toolCall = {
			id: 'call-2',
			type: 'function',
			function: { name: 'ui_ask_text', arguments: '   ' }
		};
		openai.chat.completions.create
			.mockResolvedValueOnce({
				choices: [{ message: { role: 'assistant', content: null, tool_calls: [toolCall] } }]
			})
			.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Okay' } }] });
		uiMcp.listTools.mockResolvedValue([
			{ name: 'ui_ask_text', description: 'Ask', inputSchema: { type: 'object' } }
		]);
		uiMcp.callTool.mockResolvedValue({
			content: [
				{ type: 'text', text: 'Alice' },
				{ type: 'image', data: 'abc', mimeType: 'image/png' }
			]
		});

		await chat.run([], 'model', () => undefined);

		expect(uiMcp.callTool).toHaveBeenCalledWith('ui_ask_text', {});
		expect(todoMcp.callTool).not.toHaveBeenCalled();
	});

	it('marks failed tools and unsupported tool call types', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce({
				choices: [
					{
						message: {
							role: 'assistant',
							content: null,
							tool_calls: [
								{
									id: 'failed',
									type: 'function',
									function: { name: 'delete_todo', arguments: '{}' }
								},
								{ id: 'custom', type: 'custom', custom: { name: 'other' } }
							]
						}
					}
				]
			})
			.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Done' } }] });
		todoMcp.listTools.mockResolvedValue([
			{ name: 'delete_todo', description: 'Delete', inputSchema: { type: 'object' } }
		]);
		todoMcp.callTool.mockResolvedValue({
			content: [{ type: 'text', text: 'not allowed' }],
			isError: true
		});
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		expect(received[1]).toEqual({
			role: 'tool',
			tool_call_id: 'failed',
			content: 'Tool failed: not allowed'
		});
		expect(received[2]).toEqual({
			role: 'tool',
			tool_call_id: 'custom',
			content: 'Unsupported tool call type: custom'
		});
	});

	it('turns invalid tool arguments into a failed tool message', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce({
				choices: [
					{
						message: {
							role: 'assistant',
							content: null,
							tool_calls: [
								{
									id: 'invalid',
									type: 'function',
									function: { name: 'get_todos', arguments: '[]' }
								}
							]
						}
					}
				]
			})
			.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Done' } }] });
		todoMcp.listTools.mockResolvedValue([
			{ name: 'get_todos', description: 'List', inputSchema: { type: 'object' } }
		]);
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		expect(received[1]?.role).toBe('tool');
		expect(received[1]?.content).toContain('Tool failed:');
	});

	it('stops after the maximum number of tool iterations', async () => {
		const toolCall = {
			id: 'loop',
			type: 'function',
			function: { name: 'get_todos', arguments: '{}' }
		};
		openai.chat.completions.create.mockResolvedValue({
			choices: [{ message: { role: 'assistant', content: null, tool_calls: [toolCall] } }]
		});
		todoMcp.listTools.mockResolvedValue([
			{ name: 'get_todos', description: 'List', inputSchema: { type: 'object' } }
		]);
		todoMcp.callTool.mockResolvedValue({ content: [{ type: 'text', text: '[]' }] });

		await expect(chat.run([], 'model', () => undefined)).rejects.toThrow('maximum of 3');
	});

	it('rejects a second request while one is running', async () => {
		const pending = deferred<unknown>();
		openai.chat.completions.create.mockReturnValue(pending.promise);
		const first = chat.run([], 'model', () => undefined);
		await vi.waitFor(() => {
			expect(openai.chat.completions.create).toHaveBeenCalled();
		});

		await expect(chat.run([], 'model', () => undefined)).rejects.toThrow('already running');

		pending.resolve({ choices: [{ message: { role: 'assistant', content: 'Done' } }] });
		await first;
	});

	it('stops a request that is aborted before the model answers', async () => {
		const pending = deferred<unknown>();
		openai.chat.completions.create.mockReturnValue(pending.promise);
		const received: ChatCompletionMessageParam[] = [];
		const running = chat.run([], 'model', (message) => received.push(message));
		await vi.waitFor(() => {
			expect(openai.chat.completions.create).toHaveBeenCalled();
		});

		await chat.dispose();
		pending.resolve({ choices: [{ message: { role: 'assistant', content: 'Too late' } }] });
		await running;

		expect(received).toEqual([]);
	});

	function deferred<T>(): {
		promise: Promise<T>;
		resolve: (value: T) => void;
	} {
		let resolve: (value: T) => void = () => undefined;
		const promise = new Promise<T>((res) => {
			resolve = res;
		});
		return { promise, resolve };
	}

	function last<T>(values: T[]): T {
		const value = values.at(-1);
		if (!value) throw new Error('No OpenAI instance was created');
		return value;
	}
});
