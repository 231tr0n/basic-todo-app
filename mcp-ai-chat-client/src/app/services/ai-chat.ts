import { inject, Service } from '@angular/core';
import { OpenAI } from 'openai';
import type {
	ChatCompletionAssistantMessageParam,
	ChatCompletionFunctionTool,
	ChatCompletionMessageParam,
	ChatCompletionMessageToolCall
} from 'openai/resources/chat/completions';
import { AppConfiguration } from '../config/app-configuration';
import { TodoMcpServer } from './todo-mcp-server';

/**
 * Orchestrates the AI conversation.
 *
 * Tools are discovered from the MCP server at runtime, which means adding a tool to
 * {@link TodoMcpServer} automatically makes it available to the model without touching this
 * service. Tool calls returned by the model are executed through the MCP client.
 */
@Service()
export class AiChat {
	private readonly configuration = inject(AppConfiguration);
	private readonly mcp = inject(TodoMcpServer);
	private readonly openai = new OpenAI({
		baseURL: this.configuration.aiBaseUrl,
		apiKey: this.configuration.aiApiKey,
		dangerouslyAllowBrowser: true
	});

	async initialize() {
		await this.mcp.connect();
	}

	async dispose() {
		await this.mcp.close();
	}

	async listModels(): Promise<string[]> {
		const models = await this.openai.models.list();
		return models.data.map((model) => model.id);
	}

	/**
	 * Runs the model until it produces a final answer. Every newly generated message is passed to
	 * `onMessage` so the caller can update the UI immediately.
	 */
	async run(
		history: readonly ChatCompletionMessageParam[],
		model: string,
		onMessage: (message: ChatCompletionMessageParam) => void
	): Promise<void> {
		await this.initialize();
		const tools = await this.mapTools();
		const messages: ChatCompletionMessageParam[] = [...history];

		for (let iteration = 0; iteration < this.configuration.maxToolIterations; iteration++) {
			const response = await this.openai.chat.completions.create({
				model,
				messages,
				...(tools.length > 0 ? { tools } : {})
			});
			const assistantMessage = response.choices[0].message;
			const assistantMessageParam: ChatCompletionAssistantMessageParam = assistantMessage;
			messages.push(assistantMessageParam);
			onMessage(assistantMessageParam);

			const toolCalls = assistantMessage.tool_calls ?? [];
			if (toolCalls.length === 0) return;

			for (const toolCall of toolCalls) {
				const toolMessage = await this.runToolCall(toolCall);
				messages.push(toolMessage);
				onMessage(toolMessage);
			}
		}

		throw new Error(
			`The assistant exceeded the maximum of ${this.configuration.maxToolIterations.toString()} tool iterations`
		);
	}

	private async mapTools(): Promise<ChatCompletionFunctionTool[]> {
		const tools = await this.mcp.listTools();
		return tools.map((tool) => ({
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
			const result = await this.mcp.callTool(toolCall.function.name, args);
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
