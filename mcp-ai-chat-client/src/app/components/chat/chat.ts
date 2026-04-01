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
import { MessageChannelTransport } from '../../library/mcp-message-channel-transport';
import { TitleCasePipe } from '@angular/common';
import { MarkdownToHtmlPipe } from '../../pipes/markdown-to-html-pipe';
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
		TitleCasePipe,
		MarkdownToHtmlPipe
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

	private readonly ollamaTools: {
		tool: Tool;
		implementation: (...args: unknown[]) => Promise<string | undefined>;
	}[] = [
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
			implementation: (...args: unknown[]) =>
				new Promise((resolve, reject) => {
					try {
						if (typeof args[0] !== 'string') {
							reject(Error('Argument is not a string'));
						}
						resolve(String((0, eval)(args[0] as string)));
					} catch (err: unknown) {
						reject(err as Error);
					}
				})
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
		this.connectMcpClientAndInbuiltMcpServerInstances().catch((err: unknown) => {
			this.handleError('Error connecting mcp client/server instances', true, err);
		});
		this.onRefreshAiAgentModels().catch((err: unknown) => {
			this.handleError('Error with AI agent', true, err);
		});
	}

	ngOnDestroy() {
		this.closeMcpClientAndInbuiltMcpServerInstances().catch((err: unknown) => {
			this.handleError('Error closing mcp client/server instances', true, err);
		});
	}

	private handleError(message: string, throwError: boolean, err?: unknown) {
		this.chatInputDisabled = true;
		this.changeDetector.markForCheck();
		let snackBarMessage = message;
		if (err instanceof Error) {
			snackBarMessage += `: ${err.message}`;
		}
		this.snackBar.open(snackBarMessage, 'Close', {
			duration: this.snackBarDuration()
		});
		console.log(message, err);
		if (throwError) {
			throw new Error(message);
		}
	}

	private registerInbuiltMcpServerTools() {
		// this.mcpServer.registerTool();
	}

	private async connectMcpClientAndInbuiltMcpServerInstances() {
		this.registerInbuiltMcpServerTools();
		await this.mcpServer.connect(this.transports.serverChannel);
		await this.mcpClient.connect(this.transports.clientChannel);
	}

	private async closeMcpClientAndInbuiltMcpServerInstances() {
		await this.mcpClient.close();
		await this.mcpServer.close();
	}

	private async processMessages() {
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
						`\nCalled tool ${toolCall.function.name} with parameters\n\`\`\`json\n${JSON.stringify(toolCall.function.arguments, null, '  ')}\n\`\`\`\n`
					);
				});
			}
			if (toolCalls.length === 0) {
				break;
			}
			let toolOutputFound = false;
			while (toolCalls.length > 0) {
				const toolCall = toolCalls.shift();
				if (toolCall) {
					let toolFound = false;
					for (const toolWrapper of this.ollamaTools) {
						if (toolWrapper.tool.function.name === toolCall.function.name) {
							toolFound = true;
							const args: unknown[] = [];
							if (toolWrapper.tool.function.parameters) {
								Object.keys(toolWrapper.tool.function.parameters.properties as object).forEach(
									(key) => {
										args.push(toolCall.function.arguments[key]);
									}
								);
							}
							try {
								const output = await toolWrapper.implementation(...args);
								if (output) {
									toolOutputFound = true;
									this.addMessage('tool', output, toolCall.function.name);
									this.onScroll();
								}
							} catch (e: unknown) {
								toolOutputFound = true;
								this.addMessage(
									'tool',
									`Error running tool: ${(e as Error).message}`,
									toolCall.function.name
								);
								this.onScroll();
							}
						}
					}
					if (!toolFound) {
						toolOutputFound = true;
						this.addMessage('tool', 'No such tool found', toolCall.function.name);
						this.onScroll();
					}
				}
			}
			if (!toolOutputFound) {
				break;
			}
		}
		this.chatInputDisabled = false;
	}

	private addMessage(
		role: 'user' | 'system' | 'assistant' | 'tool',
		content: string,
		tool_name?: string
	) {
		const message: SessionMessage = {
			role,
			content: content.trim()
		};
		if (tool_name) {
			message.tool_name = tool_name;
		}
		this.sessionData = [...this.sessionData, message];
	}

	private appendToLastMessage(content: string) {
		this.sessionData[this.sessionData.length - 1].content += content;
		this.sessionData[this.sessionData.length - 1].content =
			this.sessionData[this.sessionData.length - 1].content.trim();
	}

	protected async onRefreshAiAgentModels(event?: MouseEvent) {
		if (event) event.stopPropagation();
		this.availableAiAgentModels = (await this.ollama.list()).models.map((model) => model.name);
		if (this.availableAiAgentModels.length == 0) {
			throw new Error('No AI agent models found');
		}
		if (
			this.selectedAiAgentModel.length === 0 ||
			this.availableAiAgentModels.filter((value) => value === this.selectedAiAgentModel).length == 0
		) {
			this.selectedAiAgentModel = this.availableAiAgentModels[0];
			this.changeDetector.markForCheck();
		}
	}

	protected onToggleMode(event?: MouseEvent) {
		if (event) event.stopPropagation();
		if (document.body.classList.contains('dark')) {
			document.body.classList.remove('dark');
			this.darkMode = false;
		} else {
			document.body.classList.add('dark');
			this.darkMode = true;
		}
	}

	protected onScroll(event?: MouseEvent) {
		if (event) event.stopPropagation();
		const element = this.scrollableElement()?.nativeElement;
		if (element) {
			element.scrollTo({
				top: element.scrollHeight,
				behavior: 'smooth'
			});
			this.changeDetector.markForCheck();
		}
	}

	protected onClear(event?: MouseEvent) {
		if (event) event.stopPropagation();
		this.sessionData.length = 0;
	}

	protected async onSend(event?: MouseEvent) {
		if (event) event.stopPropagation();
		if (!this.chatInputDisabled && this.message) {
			const message = this.message.trim();
			if (message.length > 0) {
				this.addMessage('user', message);
				this.onScroll();
				this.message = '';
				try {
					await this.processMessages();
				} catch (err: unknown) {
					this.handleError('Error processing messages', true, err);
				}
			}
		}
	}
}
