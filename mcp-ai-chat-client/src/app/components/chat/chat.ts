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
import { ChatCompletionMessageParamMarkdownToHtmlPipe } from '../../pipes/chat-completion-message-param-markdown-to-html-pipe';
import { OpenAI } from 'openai';
import type {
	ChatCompletionMessageParam,
	ChatCompletionAssistantMessageParam,
	ChatCompletionMessageToolCall,
	ChatCompletionFunctionTool
} from 'openai/resources/chat/completions';
import { ChatCompletionMessageToolCallToMarkdownHtmlPipePipe } from '../../pipes/chat-completion-message-tool-call-to-markdown-html-pipe-pipe';

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
		ChatCompletionMessageParamMarkdownToHtmlPipe,
		ChatCompletionMessageToolCallToMarkdownHtmlPipePipe
	],
	templateUrl: './chat.html',
	styleUrl: './chat.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Chat implements OnInit, OnDestroy {
	readonly mcpClientName = input('Ai-MCP-Client');
	readonly mcpClientVersion = input('1.0.0');
	readonly mcpServerName = input('Ai-MCP-Server');
	readonly mcpServerVersion = input('1.0.0');
	readonly aiAgentModel = input('');
	readonly maxTextAreaSize = input(10);
	readonly snackBarDuration = input(5000);
	readonly openaiBaseUrl = input('http://localhost:11434/v1');
	readonly openaiApiKey = input('TEMP');

	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly snackBar = inject(MatSnackBar);

	private readonly openaiTools: {
		tool: ChatCompletionFunctionTool;
		implementation: (...args: unknown[]) => Promise<string | undefined>;
	}[] = [
		{
			tool: {
				type: 'function',
				function: {
					name: 'eval_javascript',
					description:
						'Evaluate a javascript expression and return its result. It can also be used to evaluate mathematical expressions. It returns a string if the evaluation is successful or an error message otherwise.',
					parameters: {
						type: 'object',
						properties: {
							expression: {
								type: 'string',
								description: 'The javascript expression to evaluate.'
							}
						},
						required: ['expression']
					},
					strict: true
				}
			},
			// https://esbuild.github.io/link/direct-eval
			implementation: (...args: unknown[]) =>
				new Promise((resolve, reject) => {
					try {
						if (args.length !== 1) {
							reject(Error('One argument is expected'));
						}
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
	private readonly openai = new OpenAI({
		baseURL: this.openaiBaseUrl(),
		apiKey: this.openaiApiKey(),
		dangerouslyAllowBrowser: true
	});

	protected readonly scrollableElement = viewChild<ElementRef<HTMLDivElement>>('scrollable');

	protected sessionData: ChatCompletionMessageParam[] = [];
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
		this.onClear();
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
		const toolCalls: ChatCompletionMessageToolCall[] = [];
		while (true) {
			const response = await this.openai.chat.completions.create({
				model: this.selectedAiAgentModel,
				messages: this.sessionData,
				tools: this.openaiTools.map((tool) => tool.tool)
			});
			const assistantMessage = response.choices[0].message;
			this.addAssistantMessage(assistantMessage);
			this.onScroll();
			if (assistantMessage.tool_calls) {
				assistantMessage.tool_calls.forEach((toolCall) => {
					toolCalls.push(toolCall);
				});
			}
			if (toolCalls.length === 0) {
				break;
			}
			while (toolCalls.length > 0) {
				const toolCall = toolCalls.shift();
				if (toolCall) {
					let toolFound = false;
					for (const toolWrapper of this.openaiTools) {
						if (toolCall.type !== 'function') continue;
						if (toolWrapper.tool.function.name === toolCall.function.name) {
							toolFound = true;
							try {
								const args: unknown[] = [];
								if (toolWrapper.tool.function.parameters) {
									const argumentsObj = JSON.parse(toolCall.function.arguments) as Record<
										string,
										string
									>;
									Object.keys(toolWrapper.tool.function.parameters['properties'] as object).forEach(
										(key) => {
											args.push(argumentsObj[key]);
										}
									);
								}
								try {
									const output = await toolWrapper.implementation(...args);
									this.addToolMessage(toolCall.id, output ?? '');
									this.onScroll();
								} catch (e: unknown) {
									this.addToolMessage(toolCall.id, `Error running tool: ${(e as Error).message}`);
									this.onScroll();
								}
							} catch (e: unknown) {
								this.addToolMessage(
									toolCall.id,
									`Error parsing parameters for tool: ${(e as Error).message}`
								);
								this.onScroll();
							}
						}
					}
					if (!toolFound) {
						this.addToolMessage(toolCall.id, 'No such tool found');
						this.onScroll();
					}
				}
			}
		}
		this.chatInputDisabled = false;
	}

	private addAssistantMessage(message: ChatCompletionAssistantMessageParam) {
		this.sessionData = [...this.sessionData, message];
	}

	private addUserMessage(content: string) {
		this.sessionData = [
			...this.sessionData,
			{
				role: 'user',
				content: content.trim()
			}
		];
	}

	private addDeveloperMessage(content: string) {
		this.sessionData = [
			...this.sessionData,
			{
				role: 'developer',
				content: content.trim()
			}
		];
	}

	private addToolMessage(tool_call_id: string, content: string) {
		this.sessionData = [
			...this.sessionData,
			{
				role: 'tool',
				tool_call_id,
				content: content
			}
		];
	}

	protected async onRefreshAiAgentModels(event?: MouseEvent) {
		if (event) event.stopPropagation();
		this.availableAiAgentModels = (await this.openai.models.list()).data.map((model) => model.id);
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
		this.addDeveloperMessage(
			'You are a chatbot assistant which makes use of provided tools to assist user with any questions they ask. Reply in markdown format when answering.'
		);
	}

	protected async onSend(event?: MouseEvent) {
		if (event) event.stopPropagation();
		if (!this.chatInputDisabled && this.message) {
			const message = this.message.trim();
			if (message.length > 0) {
				this.addUserMessage(message);
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
