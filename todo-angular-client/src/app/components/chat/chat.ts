import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	OnDestroy,
	OnInit,
	signal,
	viewChild
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel, MatOption, MatSelect, MatSuffix } from '@angular/material/select';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AppConfiguration } from '../../config/app-configuration';
import { AiChat } from '../../services/ai-chat';
import { GlobalApi } from '../../services/global-api';
import { UiDialogService } from '../../services/ui-dialog';
import type { McpToolGroup } from '../../types/mcp-tools';
import { ChatCompletionMessageParamMarkdownToHtmlPipe } from '../../pipes/chat-completion-message-param-markdown-to-html-pipe';
import { ChatCompletionMessageToolCallToMarkdownHtmlPipe } from '../../pipes/chat-completion-message-tool-call-to-markdown-html-pipe';
import { UiInputResult } from '../../types/ui-dialog';
import { UiDialog } from '../ui-dialog/ui-dialog';
import { ToolCatalog } from '../tool-catalog/tool-catalog';

@Component({
	selector: 'app-chat',
	imports: [
		CdkTextareaAutosize,
		FormsModule,
		MatCard,
		MatCardContent,
		MatCardHeader,
		MatCardTitle,
		MatCheckbox,
		MatFormField,
		MatIcon,
		MatMiniFabButton,
		MatInput,
		MatLabel,
		MatOption,
		MatSelect,
		MatSuffix,
		TitleCasePipe,
		UiDialog,
		ToolCatalog,
		ChatCompletionMessageParamMarkdownToHtmlPipe,
		ChatCompletionMessageToolCallToMarkdownHtmlPipe
	],
	templateUrl: './chat.html',
	styleUrl: './chat.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Chat implements OnInit, OnDestroy {
	private readonly configuration = inject(AppConfiguration);
	private readonly aiChat = inject(AiChat);
	private readonly globalApi = inject(GlobalApi);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly snackBar = inject(MatSnackBar);
	private readonly uiDialog = inject(UiDialogService);

	protected readonly scrollableElement = viewChild<ElementRef<HTMLDivElement>>('scrollable');

	protected sessionData: ChatCompletionMessageParam[] = [];
	protected message = '';
	protected availableAiAgentModels: string[] = [];
	protected selectedAiAgentModel = this.configuration.defaultAiModel;
	protected readonly debugMode = signal(false);
	protected readonly toolGroups = signal<readonly McpToolGroup[]>([]);
	protected readonly currentMaxTextAreaSize = this.configuration.maxTextAreaRows;
	protected readonly activeWidget = this.uiDialog.active;
	protected readonly processing = signal(false);
	protected readonly chatInputDisabled = computed(
		() => this.processing() || this.uiDialog.hasActive()
	);

	constructor() {
		effect(() => {
			if (this.activeWidget()) {
				this.onScroll();
			}
		});
	}

	protected get sendDisabled(): boolean {
		return this.chatInputDisabled() || this.message.trim().length === 0;
	}

	protected get visibleMessages(): ChatCompletionMessageParam[] {
		if (this.debugMode()) return this.sessionData;
		return this.sessionData.filter((message) => {
			if (message.role === 'system' || message.role === 'tool') return false;
			if (message.role === 'assistant') {
				return typeof message.content === 'string' && message.content.length > 0;
			}
			return true;
		});
	}

	private destroyed = false;
	private loadingModels = false;
	private loadingTools = false;

	ngOnInit() {
		this.onClear();
		this.initialize().catch((error: unknown) => {
			this.handleError('Error initialising the AI chat', error);
		});
	}

	ngOnDestroy() {
		this.destroyed = true;
		void this.aiChat.dispose();
	}

	private async initialize() {
		await this.aiChat.initialize();
		if (!this.isActive()) return;
		await this.onRefreshAiAgentModels();
	}

	private isActive(): boolean {
		return !this.destroyed;
	}

	private handleError(message: string, error?: unknown) {
		if (!this.isActive()) return;
		this.processing.set(false);
		let snackBarMessage = message;
		if (error instanceof Error) {
			snackBarMessage += `: ${error.message}`;
		}
		this.snackBar.open(snackBarMessage, 'Close', {
			duration: this.configuration.snackBarDuration
		});
		console.error(message, error);
		this.changeDetector.markForCheck();
	}

	protected async onRefreshAiAgentModels(event?: MouseEvent) {
		if (event) event.stopPropagation();
		if (this.loadingModels) return;

		this.loadingModels = true;
		try {
			const models = await this.aiChat.listModels();
			if (!this.isActive()) return;
			this.availableAiAgentModels = models;
			if (this.availableAiAgentModels.length === 0) {
				throw new Error('No AI agent models found');
			}
			if (!this.availableAiAgentModels.includes(this.selectedAiAgentModel)) {
				this.selectedAiAgentModel = this.availableAiAgentModels[0];
			}
			this.changeDetector.markForCheck();
		} catch (error: unknown) {
			this.handleError('Error loading AI agent models', error);
		} finally {
			this.loadingModels = false;
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

	protected onDebugModeChange(enabled: boolean) {
		this.debugMode.set(enabled);
		if (enabled && this.toolGroups().length === 0) {
			void this.loadToolGroups();
		}
	}

	private async loadToolGroups() {
		if (this.loadingTools) return;
		this.loadingTools = true;
		try {
			await this.aiChat.initialize();
			const groups = await this.aiChat.listToolGroups();
			if (!this.isActive()) return;
			this.toolGroups.set(groups);
			this.changeDetector.markForCheck();
		} catch (error: unknown) {
			this.handleError('Error loading the MCP tools', error);
		} finally {
			this.loadingTools = false;
		}
	}

	protected onClear(event?: MouseEvent) {
		if (event) event.stopPropagation();
		this.sessionData = [
			{
				role: 'system',
				content: this.configuration.aiSystemPrompt
			}
		];
	}

	protected async onSend(event?: Event) {
		if (event) event.stopPropagation();
		const message = this.message.trim();
		if (!this.isActive() || this.chatInputDisabled() || message.length === 0) return;

		this.addUserMessage(message);
		this.onScroll();
		this.message = '';
		this.processing.set(true);
		this.changeDetector.markForCheck();

		try {
			await this.aiChat.run(this.sessionData, this.selectedAiAgentModel, (newMessage) => {
				if (!this.isActive()) return;
				this.sessionData = [...this.sessionData, newMessage];
				this.onScroll();
			});
		} catch (error: unknown) {
			this.handleError('Error processing messages', error);
		} finally {
			this.processing.set(false);
			if (this.isActive()) {
				this.globalApi.refreshLoggedInUser();
				this.changeDetector.markForCheck();
			}
		}
	}

	protected onWidgetResolved(id: number, value: UiInputResult) {
		this.uiDialog.resolve(id, value);
		this.changeDetector.markForCheck();
		this.onScroll();
	}

	private addUserMessage(content: string) {
		this.sessionData = [
			...this.sessionData,
			{
				role: 'user',
				content
			}
		];
	}
}
