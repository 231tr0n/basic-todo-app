import { inject, Service } from '@angular/core';
import { OpenAI } from 'openai';
import type {
	ChatCompletionAssistantMessageParam,
	ChatCompletionFunctionTool,
	ChatCompletionMessageParam,
	ChatCompletionMessageToolCall
} from 'openai/resources/chat/completions';
import { AppConfiguration } from '../config/app-configuration';
import { TodoMcpClient } from './todo-mcp-client';
import { UiMcpServer } from './ui-mcp-server';

@Service()
export class AiChat {
	private readonly configuration = inject(AppConfiguration);
	private readonly todoMcp = inject(TodoMcpClient);
	private readonly uiMcp = inject(UiMcpServer);
	private readonly openai = new OpenAI({
		baseURL: this.configuration.aiBaseUrl,
		apiKey: this.configuration.aiApiKey,
		dangerouslyAllowBrowser: true
	});

	private abortController: AbortController | null = null;
	private running = false;

	async initialize(): Promise<void> {
		const controller = this.ensureAbortController();
		await Promise.all([this.todoMcp.connect(), this.uiMcp.connect()]);
		if (controller.signal.aborted) {
			throw new Error('The AI chat was closed while initializing');
		}
	}

	async dispose(): Promise<void> {
		this.abortController?.abort();
		this.abortController = null;
		await Promise.allSettled([this.todoMcp.close(), this.uiMcp.close()]);
	}

	async listModels(): Promise<string[]> {
		const controller = this.ensureAbortController();
		const models = await this.openai.models.list({ signal: controller.signal });
		return models.data.map((model) => model.id);
	}

	async run(
		history: readonly ChatCompletionMessageParam[],
		model: string,
		onMessage: (message: ChatCompletionMessageParam) => void
	): Promise<void> {
		if (this.running) {
			throw new Error('A chat request is already running');
		}
		this.running = true;
		let controller: AbortController | null = null;

		try {
			await this.initialize();
			controller = this.abortController;
			if (!controller || this.isAborted(controller.signal)) return;
			const signal = controller.signal;

			const tools = await this.mapTools();
			const messages: ChatCompletionMessageParam[] = [...history];

			for (let iteration = 0; iteration < this.configuration.maxToolIterations; iteration++) {
				const response = await this.openai.chat.completions.create(
					{
						model,
						messages,
						temperature: this.configuration.aiTemperature,
						...(tools.length > 0 ? { tools } : {})
					},
					{ signal }
				);
				if (this.isAborted(signal)) return;

				const assistantMessage = response.choices[0].message;
				const assistantMessageParam: ChatCompletionAssistantMessageParam = assistantMessage;
				messages.push(assistantMessageParam);
				onMessage(assistantMessageParam);

				const toolCalls = assistantMessage.tool_calls ?? [];
				if (toolCalls.length === 0) return;

				for (const toolCall of toolCalls) {
					const toolMessage = await this.runToolCall(toolCall);
					if (this.isAborted(signal)) return;
					messages.push(toolMessage);
					onMessage(toolMessage);
				}
			}

			throw new Error(
				`The assistant exceeded the maximum of ${this.configuration.maxToolIterations.toString()} tool iterations`
			);
		} catch (error: unknown) {
			if (controller && this.isAborted(controller.signal)) return;
			throw error;
		} finally {
			this.running = false;
		}
	}

	private isAborted(signal: AbortSignal): boolean {
		return signal.aborted;
	}

	private ensureAbortController(): AbortController {
		this.abortController ??= new AbortController();
		return this.abortController;
	}

	private async mapTools(): Promise<ChatCompletionFunctionTool[]> {
		const [todoTools, uiTools] = await Promise.all([
			this.todoMcp.listTools(),
			this.uiMcp.listTools()
		]);
		return [...todoTools, ...uiTools].map((tool) => ({
			type: 'function' as const,
			function: {
				name: tool.name,
				description: tool.description ?? '',
				parameters: tool.inputSchema
			}
		}));
	}

	private async runToolCall(
		toolCall: ChatCompletionMessageToolCall
	): Promise<ChatCompletionMessageParam> {
		if (toolCall.type !== 'function') {
			return {
				role: 'tool',
				tool_call_id: toolCall.id,
				content: `Unsupported tool call type: ${toolCall.type}`
			};
		}

		try {
			const args = this.parseArguments(toolCall.function.arguments);
			const result = toolCall.function.name.startsWith('ui_')
				? await this.uiMcp.callTool(toolCall.function.name, args)
				: await this.todoMcp.callTool(toolCall.function.name, args);
			const content = result.content
				.map((item) => (item.type === 'text' ? item.text : JSON.stringify(item)))
				.join('\n');
			return {
				role: 'tool',
				tool_call_id: toolCall.id,
				content: result.isError ? `Tool failed: ${content}` : content
			};
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				role: 'tool',
				tool_call_id: toolCall.id,
				content: `Tool failed: ${message}`
			};
		}
	}

	private parseArguments(raw: string): Record<string, unknown> {
		if (raw.trim().length === 0) return {};
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new Error('Tool arguments must be a JSON object');
		}
		return parsed as Record<string, unknown>;
	}
}
