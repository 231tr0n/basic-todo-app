import { TestBed } from '@angular/core/testing';
import type {
	ChatCompletionChunk,
	ChatCompletionMessageParam,
	ChatCompletionToolMessageParam
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { AppConfiguration } from '../config/app-configuration';
import { AiChat } from './ai-chat';
import { TodoMcpClient } from './todo-mcp-client';
import { UiMcpServer } from './ui-mcp-server';

/** The completions endpoint is only ever called for streaming chat completions here. */
type CreateMock = (
	body: unknown,
	options?: { signal?: AbortSignal }
) => Promise<Stream<ChatCompletionChunk>>;

const openaiMock = vi.hoisted(() => ({
	instances: [] as {
		models: { list: ReturnType<typeof vi.fn> };
		chat: { completions: { create: Mock<CreateMock> } };
	}[]
}));

vi.mock('openai', () => ({
	OpenAI: class {
		models = { list: vi.fn() };
		chat = { completions: { create: vi.fn<CreateMock>() } };

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
	chat: { completions: { create: Mock<CreateMock> } };
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

	it('streams a request without tool calls and requests a stream', async () => {
		openai.chat.completions.create.mockResolvedValue(
			streamOf(chunk({ role: 'assistant', content: 'Hello' }), chunk({ content: null }))
		);
		const received: ChatCompletionMessageParam[] = [];
		const partials: string[] = [];

		await chat.run(
			[],
			'model',
			(message) => received.push(message),
			(text) => partials.push(text)
		);

		expect(openai.chat.completions.create).toHaveBeenCalledWith(
			expect.objectContaining({ stream: true, model: 'model' }),
			expect.anything()
		);
		expect(partials).toEqual(['Hello']);
		expect(received).toEqual([{ role: 'assistant', content: 'Hello', refusal: null }]);
	});

	it('keeps streaming assistant content across neighbouring deltas', async () => {
		openai.chat.completions.create.mockResolvedValue(
			streamOf(
				chunk({ role: 'assistant', content: 'He' }),
				chunk({ content: 'll' }),
				chunk({ content: 'o' }),
				chunk({ content: null })
			)
		);
		const received: ChatCompletionMessageParam[] = [];
		const partials: string[] = [];

		await chat.run(
			[],
			'model',
			(message) => received.push(message),
			(text) => partials.push(text)
		);

		expect(partials).toEqual(['He', 'Hell', 'Hello']);
		expect(received).toEqual([{ role: 'assistant', content: 'Hello', refusal: null }]);
	});

	it('assembles streamed refusals without marking them as content', async () => {
		openai.chat.completions.create.mockResolvedValue(
			streamOf(chunk({ role: 'assistant', refusal: 'Sorry, ' }), chunk({ refusal: 'not allowed' }))
		);
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		expect(received).toEqual([{ role: 'assistant', content: null, refusal: 'Sorry, not allowed' }]);
	});

	it('runs backend tools and sends their output back to the model', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce(
				streamOf(
					chunk({
						role: 'assistant',
						tool_calls: [
							{
								index: 0,
								id: 'call-1',
								type: 'function',
								function: { name: 'get_todos', arguments: '{"limit":' }
							}
						]
					}),
					chunk({
						tool_calls: [{ index: 0, function: { arguments: '5}' } }]
					}),
					chunk({ content: null })
				)
			)
			.mockResolvedValueOnce(
				streamOf(chunk({ role: 'assistant', content: 'Done' }), chunk({ content: null }))
			);
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

	it('keeps parallel tool calls in their streamed order', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce(
				streamOf(
					chunk({
						role: 'assistant',
						tool_calls: [
							{
								index: 1,
								id: 'call-2',
								type: 'function',
								function: { name: 'delete_todo', arguments: '{}' }
							}
						]
					}),
					chunk({
						tool_calls: [
							{
								index: 0,
								id: 'call-1',
								type: 'function',
								function: { name: 'get_todos', arguments: '{}' }
							}
						]
					}),
					chunk({ content: null })
				)
			)
			.mockResolvedValueOnce(
				streamOf(chunk({ role: 'assistant', content: 'Done' }), chunk({ content: null }))
			);
		todoMcp.listTools.mockResolvedValue([
			{
				name: 'get_todos',
				description: 'List todos',
				inputSchema: { type: 'object', properties: {} }
			},
			{
				name: 'delete_todo',
				description: 'Delete todo',
				inputSchema: {
					type: 'object',
					properties: { todoId: { type: 'number' } },
					required: ['todoId']
				}
			}
		]);
		todoMcp.callTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		const toolCalls = received
			.filter((message): message is ChatCompletionToolMessageParam => message.role === 'tool')
			.map((message) => message.tool_call_id);
		expect(toolCalls).toEqual(['call-1', 'call-2']);
	});

	it('runs UI tools through the UI MCP server', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce(
				streamOf(
					chunk({
						role: 'assistant',
						tool_calls: [
							{
								index: 0,
								id: 'call-2',
								type: 'function',
								function: { name: 'ui_ask_text', arguments: '   ' }
							}
						]
					}),
					chunk({ content: null })
				)
			)
			.mockResolvedValueOnce(
				streamOf(chunk({ role: 'assistant', content: 'Okay' }), chunk({ content: null }))
			);
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

	it('marks failed tools and custom tool call types', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce(
				streamOf(
					chunk({
						role: 'assistant',
						tool_calls: [
							{
								index: 0,
								id: 'failed',
								type: 'function',
								function: { name: 'delete_todo', arguments: '{}' }
							},
							{ index: 1, id: 'custom', type: 'custom', custom: { name: 'other' } }
						]
					}),
					chunk({ content: null })
				)
			)
			.mockResolvedValueOnce(
				streamOf(chunk({ role: 'assistant', content: 'Done' }), chunk({ content: null }))
			);
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

	it('drops incomplete tool call deltas without id or name', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce(
				streamOf(
					chunk({
						role: 'assistant',
						tool_calls: [
							{
								index: 0,
								id: 'complete',
								type: 'function',
								function: { name: 'get_todos', arguments: '{}' }
							},
							{ index: 1, function: { name: 'get_todos', arguments: '{}' } },
							{ index: 2, id: 'no-name', type: 'function', function: { arguments: '{}' } }
						]
					}),
					chunk({ content: null })
				)
			)
			.mockResolvedValueOnce(
				streamOf(chunk({ role: 'assistant', content: 'Done' }), chunk({ content: null }))
			);
		todoMcp.listTools.mockResolvedValue([
			{ name: 'get_todos', description: 'List todos', inputSchema: { type: 'object' } }
		]);
		todoMcp.callTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		const toolCalls = received
			.filter((message): message is ChatCompletionToolMessageParam => message.role === 'tool')
			.map((message) => message.tool_call_id);
		expect(toolCalls).toEqual(['complete']);
	});

	it('turns invalid tool arguments into a failed tool message', async () => {
		openai.chat.completions.create
			.mockResolvedValueOnce(
				streamOf(
					chunk({
						role: 'assistant',
						tool_calls: [
							{
								index: 0,
								id: 'invalid',
								type: 'function',
								function: { name: 'get_todos', arguments: '[]' }
							}
						]
					}),
					chunk({ content: null })
				)
			)
			.mockResolvedValueOnce(
				streamOf(chunk({ role: 'assistant', content: 'Done' }), chunk({ content: null }))
			);
		todoMcp.listTools.mockResolvedValue([
			{ name: 'get_todos', description: 'List', inputSchema: { type: 'object' } }
		]);
		const received: ChatCompletionMessageParam[] = [];

		await chat.run([], 'model', (message) => received.push(message));

		expect(received[1]?.role).toBe('tool');
		expect(received[1]?.content).toContain('Tool failed:');
	});

	it('stops after the maximum number of tool iterations', async () => {
		// Each completions call must open a fresh stream that asks for the same tool again.
		openai.chat.completions.create.mockImplementation(() =>
			Promise.resolve(
				streamOf(
					chunk({
						role: 'assistant',
						tool_calls: [
							{
								index: 0,
								id: 'loop',
								type: 'function',
								function: { name: 'get_todos', arguments: '{}' }
							}
						]
					}),
					chunk({ content: null })
				)
			)
		);
		todoMcp.listTools.mockResolvedValue([
			{ name: 'get_todos', description: 'List', inputSchema: { type: 'object' } }
		]);
		todoMcp.callTool.mockResolvedValue({ content: [{ type: 'text', text: '[]' }] });

		await expect(chat.run([], 'model', () => undefined)).rejects.toThrow('maximum of 3');
	});

	it('rejects a second request while one is running', async () => {
		const pending = deferred<Stream<ChatCompletionChunk>>();
		openai.chat.completions.create.mockReturnValue(pending.promise);
		const first = chat.run([], 'model', () => undefined);
		await vi.waitFor(() => {
			expect(openai.chat.completions.create).toHaveBeenCalled();
		});

		await expect(chat.run([], 'model', () => undefined)).rejects.toThrow('already running');

		pending.resolve(streamOf(chunk({ content: 'Done' })));
		await first;
	});

	it('stops a request that is aborted before the stream opens', async () => {
		const pending = deferred<Stream<ChatCompletionChunk>>();
		openai.chat.completions.create.mockReturnValue(pending.promise);
		const received: ChatCompletionMessageParam[] = [];
		const partials: string[] = [];
		const running = chat.run(
			[],
			'model',
			(message) => received.push(message),
			(text) => partials.push(text)
		);
		await vi.waitFor(() => {
			expect(openai.chat.completions.create).toHaveBeenCalled();
		});

		await chat.dispose();
		pending.resolve(streamOf(chunk({ content: 'Too late' })));
		await running;

		expect(received).toEqual([]);
		expect(partials).toEqual([]);
	});

	it('drops a partially streamed answer when aborted mid-stream', async () => {
		openai.chat.completions.create.mockImplementation(() =>
			Promise.resolve(
				(async function* (): AsyncGenerator<ChatCompletionChunk> {
					yield chunk({ content: 'part' });
					while (true) {
						await new Promise<void>((resolve) => {
							setTimeout(resolve, 1);
						});
						yield chunk({ content: 'more' });
					}
				})() as unknown as Stream<ChatCompletionChunk>
			)
		);
		const received: ChatCompletionMessageParam[] = [];
		const partials: string[] = [];
		const running = chat.run(
			[],
			'model',
			(message) => received.push(message),
			(text) => partials.push(text)
		);
		await vi.waitFor(() => {
			expect(partials).toContain('part');
		});

		await chat.dispose();
		await running;

		expect(received).toEqual([]);
	});

	function streamOf(...chunks: ChatCompletionChunk[]): Stream<ChatCompletionChunk> {
		const queue = [...chunks];
		const iterable: AsyncIterable<ChatCompletionChunk> = {
			[Symbol.asyncIterator]: () => {
				return {
					next: (): Promise<IteratorResult<ChatCompletionChunk>> => {
						const value = queue.shift();
						return value === undefined
							? Promise.resolve({ done: true, value: undefined })
							: Promise.resolve({ done: false, value });
					}
				};
			}
		};
		return iterable as unknown as Stream<ChatCompletionChunk>;
	}

	function chunk(delta: ChatCompletionChunk.Choice['delta']): ChatCompletionChunk {
		return {
			id: 'chunk-1',
			created: 1700000000,
			model: 'test-model',
			object: 'chat.completion.chunk',
			choices: [{ index: 0, delta, finish_reason: null }]
		};
	}

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
