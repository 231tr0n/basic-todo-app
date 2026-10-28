import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	OnInit,
	OnDestroy,
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
import { MatTooltip } from '@angular/material/tooltip';
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

/** Distance from the bottom inside which the chat counts as pinned to the bottom. */
const PIN_TO_BOTTOM_THRESHOLD = 32;

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
		MatTooltip,
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

	/** The assistant reply streaming in right now, before it is finalised. */
	protected readonly streamedAssistant = signal('');
	/** Whether the window sticks to the bottom while new content arrives. */
	protected readonly stickToBottom = signal(true);

	protected get streamingDraft(): ChatCompletionMessageParam {
		return { role: 'assistant', content: this.streamedAssistant() };
	}

	protected get streaming(): boolean {
		return this.streamedAssistant().length > 0;
	}

	protected get showJumpButton(): boolean {
		return !this.stickToBottom();
	}

	constructor() {
		effect(() => {
			if (this.activeWidget()) {
				this.autoScroll();
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

	/**
	 * Scrolls to the very bottom, regardless of whether the window is pinned.
	 * Bound to the "jump to bottom" button and initial layout.
	 */
	protected onScroll(event?: MouseEvent) {
		if (event) event.stopPropagation();
		this.stickToBottom.set(true);
		this.scrollToBottom(false);
		this.changeDetector.markForCheck();
	}

	/**
	 * Follows user scrolling: the window is pinned while it sits at (or within a few
	 * pixels of) the bottom, and unpinned while the user reads earlier messages.
	 */
	protected onNativeScroll(): void {
		const element = this.scrollableElement()?.nativeElement;
		if (!element) return;
		this.stickToBottom.set(
			element.scrollTop + element.clientHeight >= element.scrollHeight - PIN_TO_BOTTOM_THRESHOLD
		);
	}

	/**
	 * Keeps a pinned window at the bottom as content arrives or grows, and leaves it
	 * alone while the user is reading earlier messages.
	 */
	private autoScroll(instant = false): void {
		if (this.stickToBottom()) {
			this.scrollToBottom(instant);
			this.changeDetector.markForCheck();
		}
	}

	private scrollToBottom(instant: boolean): void {
		const element = this.scrollableElement()?.nativeElement;
		if (!element) return;
		element.scrollTo({
			top: element.scrollHeight,
			behavior: instant ? 'auto' : 'smooth'
		});
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
		this.streamedAssistant.set('');
		this.sessionData = [
			{
				role: 'system',
				content: this.configuration.aiSystemPrompt
			}
		];
		this.changeDetector.markForCheck();
	}

	protected async onSend(event?: Event) {
		if (event) event.stopPropagation();
		const message = this.message.trim();
		if (!this.isActive() || this.chatInputDisabled() || message.length === 0) return;

		this.stickToBottom.set(true);
		this.addUserMessage(message);
		this.autoScroll();
		this.message = '';
		this.processing.set(true);
		this.changeDetector.markForCheck();

		try {
			await this.aiChat.run(
				this.sessionData,
				this.selectedAiAgentModel,
				(newMessage) => {
					if (!this.isActive()) return;
					this.sessionData = [...this.sessionData, newMessage];
					this.autoScroll();
				},
				(partial) => {
					if (!this.isActive()) return;
					this.streamedAssistant.set(partial);
					this.autoScroll(true);
				}
			);
		} catch (error: unknown) {
			this.handleError('Error processing messages', error);
		} finally {
			this.streamedAssistant.set('');
			this.processing.set(false);
			if (this.isActive()) {
				this.globalApi.refreshLoggedInUser();
				this.changeDetector.markForCheck();
			}
		}
	}

	protected onWidgetResolved(id: number, value: UiInputResult) {
		this.uiDialog.resolve(id, value);
		this.autoScroll();
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
