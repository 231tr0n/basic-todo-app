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
import { ChatCompletionMessageParamMarkdownToHtmlPipe } from '../../pipes/chat-completion-message-param-markdown-to-html-pipe';
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
	private readonly configuration = inject(AppConfiguration);
	private readonly aiChat = inject(AiChat);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly snackBar = inject(MatSnackBar);

	protected readonly scrollableElement = viewChild<ElementRef<HTMLDivElement>>('scrollable');

	protected sessionData: ChatCompletionMessageParam[] = [];
	protected message = '';
	protected darkMode = false;
	protected availableAiAgentModels: string[] = [];
	protected selectedAiAgentModel = this.configuration.defaultAiModel;
	protected chatInputDisabled = false;
	protected readonly currentMaxTextAreaSize = this.configuration.maxTextAreaRows;

	ngOnInit() {
		if (document.body.classList.contains('dark')) {
			this.darkMode = true;
		}
		this.onClear();
		this.initialize().catch((error: unknown) => {
			this.handleError('Error initialising the AI chat', error);
		});
	}

	ngOnDestroy() {
		this.aiChat.dispose().catch((error: unknown) => {
			this.handleError('Error closing MCP client/server instances', error);
		});
	}

	private async initialize() {
		await this.aiChat.initialize();
		await this.onRefreshAiAgentModels();
	}

	private handleError(message: string, error?: unknown) {
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
		try {
			this.availableAiAgentModels = await this.aiChat.listModels();
			if (this.availableAiAgentModels.length === 0) {
				throw new Error('No AI agent models found');
			}
			if (!this.availableAiAgentModels.includes(this.selectedAiAgentModel)) {
				this.selectedAiAgentModel = this.availableAiAgentModels[0];
			}
			this.changeDetector.markForCheck();
		} catch (error: unknown) {
			this.handleError('Error loading AI agent models', error);
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
		this.sessionData = [
			{
				role: 'system',
				content: this.configuration.aiSystemPrompt
			}
		];
	}

	protected async onSend(event?: MouseEvent) {
		if (event) event.stopPropagation();
		const message = this.message.trim();
		if (this.chatInputDisabled || message.length === 0) return;

		this.addUserMessage(message);
		this.onScroll();
		this.message = '';
		this.chatInputDisabled = true;
		this.changeDetector.markForCheck();

		try {
			await this.aiChat.run(this.sessionData, this.selectedAiAgentModel, (newMessage) => {
				this.sessionData = [...this.sessionData, newMessage];
				this.onScroll();
			});
		} catch (error: unknown) {
			this.handleError('Error processing messages', error);
		} finally {
			this.chatInputDisabled = false;
			this.changeDetector.markForCheck();
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
