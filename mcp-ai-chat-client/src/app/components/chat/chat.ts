import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	inject,
	input,
	OnDestroy,
	OnInit,
	viewChild
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel, MatOption, MatSelect, MatSuffix } from '@angular/material/select';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { MessageChannelTransport } from '../../library/mcp-message-channel-transport';
import { TitleCasePipe } from '@angular/common';
import { Ollama, Tool, ToolCall } from 'ollama/browser';

interface SessionMessage {
	content: string;
	role: 'user' | 'system' | 'assistant' | 'tool';
	tool_name?: string;
}

@Component({
	selector: 'app-home',
	imports: [
		CdkTextareaAutosize,
		FormsModule,
		MatCard,
		MatCardContent,
		MatCardHeader,
		MatCardTitle,
		MatFormField,
		MatIcon,
		MatMiniFabButton,
		MatInput,
		MatLabel,
		MatOption,
		MatSelect,
		MatSuffix,
		TitleCasePipe
	],
	templateUrl: './chat.html',
	styleUrl: './chat.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Chat implements OnInit, OnDestroy {
	readonly session = input<SessionMessage[]>([]);
	readonly mcpClientName = input('Ai-MCP-Client');
	readonly mcpClientVersion = input('1.0.0');
	readonly mcpServerName = input('Ai-MCP-Server');
	readonly mcpServerVersion = input('1.0.0');
	readonly aiAgentModel = input('');
	readonly maxTextAreaSize = input(10);
	readonly snackBarDuration = input(5000);
	readonly ollamaHost = input('http://localhost:11434');

	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly snackBar = inject(MatSnackBar);

	private readonly ollamaTools: { tool: Tool; implementation: unknown }[] = [
		{
			tool: {
				type: 'function',
				function: {
					name: 'eval',
					description:
						'Evaluate a javascript expression and return its result. It can also be used to evaluate mathematical expressions.',
					parameters: {
						type: 'object',
						properties: {
							expression: {
								type: 'string',
								description: 'The javascript expression to evaluate.'
							}
						},
						required: ['expression']
					}
				}
			},
			// https://esbuild.github.io/link/direct-eval
			implementation: (expression: string) => String((0, eval)(expression))
		}
	];
	private readonly mcpClient: Client = new Client({
		name: this.mcpClientName(),
		version: this.mcpClientVersion()
	});
	private readonly mcpServer: McpServer = new McpServer({
		name: this.mcpServerName(),
		version: this.mcpServerVersion()
	});
	private readonly transports = MessageChannelTransport.createChannelPair();
	private readonly ollama = new Ollama({ host: this.ollamaHost() });

	protected readonly scrollableElement = viewChild<ElementRef<HTMLDivElement>>('scrollable');

	protected sessionData: SessionMessage[] = this.session();
	protected message = '';
	protected darkMode = false;
	protected availableAiAgentModels: string[] = [];
	protected selectedAiAgentModel = this.aiAgentModel();
	protected chatInputDisabled = false;
	protected currentMaxTextAreaSize = this.maxTextAreaSize();

	ngOnInit() {
		if (document.body.classList.contains('dark')) {
			this.darkMode = true;
		}
		this.connectMcpClientAndInbuiltMcpServerInstances()
			.then(async () => {
				this.availableAiAgentModels = (await this.ollama.list()).models.map((model) => model.name);
				if (
					this.selectedAiAgentModel.length === 0 ||
					this.availableAiAgentModels.filter((value) => value === this.selectedAiAgentModel)
						.length == 0
				) {
					if (this.availableAiAgentModels.length == 0) {
						this.handleError('No Ai agent models available', true);
					}
					this.selectedAiAgentModel = this.availableAiAgentModels[0];
					this.changeDetector.markForCheck();
				}
			})
			.catch((err: unknown) => {
				this.handleError('Error connecting mcp client/server instances', true, err);
			});
	}

	ngOnDestroy() {
		this.closeMcpClientAndInbuiltMcpServerInstances().catch((err: unknown) => {
			this.handleError('Error closing mcp client/server instances', true, err);
		});
	}

	handleError(message: string, throwError: boolean, err?: unknown) {
		this.chatInputDisabled = true;
		this.changeDetector.markForCheck();
		this.snackBar.open(message, 'Close', {
			duration: this.snackBarDuration()
		});
		console.log(message, err);
		if (throwError) {
			throw new Error(message);
		}
	}

	registerInbuiltMcpServerTools() {
		// this.mcpServer.registerTool();
	}

	async connectMcpClientAndInbuiltMcpServerInstances() {
		this.registerInbuiltMcpServerTools();
		await this.mcpServer.connect(this.transports.serverChannel);
		await this.mcpClient.connect(this.transports.clientChannel);
	}

	async closeMcpClientAndInbuiltMcpServerInstances() {
		await this.mcpClient.close();
		await this.mcpServer.close();
	}

	async connectMcpClientToExternalServer(transport: Transport) {
		await this.mcpClient.connect(transport);
	}

	toggleMode() {
		if (document.body.classList.contains('dark')) {
			document.body.classList.remove('dark');
			this.darkMode = false;
		} else {
			document.body.classList.add('dark');
			this.darkMode = true;
		}
	}

	onScroll() {
		const element = this.scrollableElement()?.nativeElement;
		if (element) {
			element.scrollTo({
				top: element.scrollHeight,
				behavior: 'smooth'
			});
			this.changeDetector.markForCheck();
		}
	}

	async processMessages() {
		this.chatInputDisabled = true;
		const toolCalls: ToolCall[] = [];
		while (true) {
			const response = await this.ollama.chat({
				model: this.selectedAiAgentModel,
				messages: this.sessionData,
				tools: this.ollamaTools.map((tool) => tool.tool),
				stream: true
			});
			this.addMessage('assistant', '');
			this.onScroll();
			for await (const part of response) {
				this.appendToLastMessage(part.message.content);
				this.onScroll();
				part.message.tool_calls?.forEach((toolCall) => {
					toolCalls.push(toolCall);
					this.appendToLastMessage(
						`\nCalled tool ${toolCall.function.name} with parameters\n**${JSON.stringify(toolCall.function.arguments, null, '  ')}**\n`
					);
				});
			}
			if (toolCalls.length === 0) {
				break;
			}
			while (toolCalls.length > 0) {
				const toolCall = toolCalls.pop();
				if (toolCall) {
					this.ollamaTools.forEach((toolWrapper) => {
						if (toolWrapper.tool.function.name === toolCall.function.name) {
							const args: unknown[] = [];
							if (toolWrapper.tool.function.parameters) {
								Object.keys(toolWrapper.tool.function.parameters.properties as object).forEach(
									(key) => {
										args.push(toolCall.function.arguments[key]);
									}
								);
							}
							const output = (toolWrapper.implementation as (...args: unknown[]) => string)(
								...args
							);
							this.addMessage('tool', output, toolCall.function.name);
						}
					});
				}
			}
		}
		this.chatInputDisabled = false;
	}

	onClear() {
		this.sessionData.length = 0;
	}

	addMessage(role: 'user' | 'system' | 'assistant' | 'tool', content: string, tool_name?: string) {
		const message: SessionMessage = {
			role,
			content: content.trim()
		};
		if (tool_name) {
			message.tool_name = tool_name;
		}
		this.sessionData = [...this.sessionData, message];
	}

	appendToLastMessage(content: string) {
		this.sessionData[this.sessionData.length - 1].content += content;
		this.sessionData[this.sessionData.length - 1].content =
			this.sessionData[this.sessionData.length - 1].content.trim();
	}

	async onSend() {
		if (!this.chatInputDisabled && this.message) {
			const message = this.message.trim();
			if (message.length > 0) {
				this.addMessage('user', message);
				this.onScroll();
				this.message = '';
				await this.processMessages();
			}
		}
	}
}
