import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	inject,
	input,
	OnDestroy,
	OnInit,
	output,
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
import OpenAI from 'openai';

interface SessionMessage {
	content: string;
	author: 'User' | 'Bot' | 'Tool';
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
		MatSuffix
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
	readonly aiAgentBaseURL = input('http://localhost:11434/v1/');
	readonly aiAgentApiKey = input('ollama');
	readonly aiAgentModel = input('');
	readonly maxTextAreaSize = input(10);
	readonly snackBarDuration = input(5000);
	readonly chatMessageEvent = output<string>();

	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly snackBar = inject(MatSnackBar);

	private readonly mcpClient: Client = new Client({
		name: this.mcpClientName(),
		version: this.mcpClientVersion()
	});
	private readonly mcpServer: McpServer = new McpServer({
		name: this.mcpServerName(),
		version: this.mcpServerVersion()
	});
	private readonly transports = MessageChannelTransport.createChannelPair();
	private readonly aiAgent: OpenAI = new OpenAI({
		baseURL: this.aiAgentBaseURL(),
		apiKey: this.aiAgentApiKey(),
		dangerouslyAllowBrowser: true
	});

	protected readonly scrollableElement = viewChild<ElementRef<HTMLDivElement>>('scrollable');
	protected readonly sessionData: SessionMessage[] = this.session();

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
				this.availableAiAgentModels = (await this.aiAgent.models.list()).data.map(
					(model) => model.id
				);
				if (
					this.selectedAiAgentModel.length === 0 ||
					this.availableAiAgentModels.filter((value) => value === this.selectedAiAgentModel)
						.length == 0
				) {
					if (this.availableAiAgentModels.length == 0) {
						this.handleError('No Ai agent models available', true);
					}
					this.selectedAiAgentModel = this.availableAiAgentModels[0];
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
		this.changeDetector.detectChanges();
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
			this.changeDetector.detectChanges();
		}
	}

	async processMessages() {
		this.chatInputDisabled = true;
		this.changeDetector.detectChanges();
		// code goes here
		this.chatInputDisabled = false;
		this.changeDetector.detectChanges();
	}

	onClear() {
		this.sessionData.length = 0;
	}

	async onSend() {
		if (!this.chatInputDisabled && this.message) {
			const message = this.message.trim();
			if (message.length > 0) {
				this.sessionData.push({
					content: message,
					author: 'User'
				});
				this.changeDetector.detectChanges();
				this.onScroll();
				this.chatMessageEvent.emit(this.message);
				this.message = '';
				await this.processMessages();
			}
		}
	}
}
