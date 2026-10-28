import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	inject,
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
import { TitleCasePipe } from '@angular/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AppConfiguration } from '../../config/app-configuration';
import { AiChat } from '../../services/ai-chat';
import { GlobalApi } from '../../services/global-api';
import { ChatCompletionMessageParamMarkdownToHtmlPipe } from '../../pipes/chat-completion-message-param-markdown-to-html-pipe';
import { ChatCompletionMessageToolCallToMarkdownHtmlPipePipe } from '../../pipes/chat-completion-message-tool-call-to-markdown-html-pipe-pipe';

@Component({
	selector: 'app-chat',
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
	private readonly configuration = inject(AppConfiguration);
	private readonly aiChat = inject(AiChat);
	private readonly globalApi = inject(GlobalApi);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly snackBar = inject(MatSnackBar);

	protected readonly scrollableElement = viewChild<ElementRef<HTMLDivElement>>('scrollable');

	protected sessionData: ChatCompletionMessageParam[] = [];
	protected message = '';
	protected availableAiAgentModels: string[] = [];
	protected selectedAiAgentModel = this.configuration.defaultAiModel;
	protected chatInputDisabled = false;
	protected readonly currentMaxTextAreaSize = this.configuration.maxTextAreaRows;

	private destroyed = false;
	private loadingModels = false;

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
		this.chatInputDisabled = false;
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
		if (!this.isActive() || this.chatInputDisabled || message.length === 0) return;

		this.addUserMessage(message);
		this.onScroll();
		this.message = '';
		this.chatInputDisabled = true;
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
			this.chatInputDisabled = false;
			if (this.isActive()) {
				this.globalApi.refreshLoggedInUser();
				this.changeDetector.markForCheck();
			}
		}
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
