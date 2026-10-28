import type { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { vi } from 'vitest';

import { Chat } from './chat';
import { AiChat } from '../../services/ai-chat';
import { GlobalApi } from '../../services/global-api';
import { UiDialogService } from '../../services/ui-dialog';

interface ChatInternals {
	message: string;
	debugMode: WritableSignal<boolean>;
	sessionData: ChatCompletionMessageParam[];
	visibleMessages: ChatCompletionMessageParam[];
	onSend(): Promise<void>;
	onClear(): void;
	ngOnInit(): void;
	onRefreshAiAgentModels(event?: MouseEvent): Promise<void>;
	onDebugModeChange(enabled: boolean): void;
	ngOnDestroy(): void;
}

describe('Chat', () => {
	let component: Chat;
	let fixture: ComponentFixture<Chat>;
	let internals: ChatInternals;
	let aiChat: {
		initialize: ReturnType<typeof vi.fn>;
		dispose: ReturnType<typeof vi.fn>;
		listModels: ReturnType<typeof vi.fn>;
		listToolGroups: ReturnType<typeof vi.fn>;
		run: ReturnType<typeof vi.fn>;
	};
	let globalApi: { refreshLoggedInUser: ReturnType<typeof vi.fn> };
	let snackBar: { open: ReturnType<typeof vi.fn> };
	let uiDialog: UiDialogService;
	let element: HTMLElement;

	beforeEach(async () => {
		Element.prototype.scrollTo = vi.fn();
		aiChat = {
			initialize: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn().mockResolvedValue(undefined),
			listModels: vi.fn().mockResolvedValue(['test-model']),
			listToolGroups: vi.fn().mockResolvedValue([
				{
					server: 'Todo MCP server',
					tools: [
						{
							name: 'get_todos',
							description: 'List todos',
							inputSchema: { type: 'object', required: [] }
						}
					]
				},
				{
					server: 'UI MCP server',
					tools: [
						{
							name: 'ui_ask_text',
							description: 'Ask for text',
							inputSchema: { type: 'object', required: ['prompt'] }
						}
					]
				}
			]),
			run: vi.fn().mockResolvedValue(undefined)
		};
		globalApi = { refreshLoggedInUser: vi.fn() };
		snackBar = { open: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [Chat],
			providers: [
				provideRouter([]),
				{ provide: AiChat, useValue: aiChat },
				{ provide: GlobalApi, useValue: globalApi },
				{ provide: MatSnackBar, useValue: snackBar }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(Chat);
		component = fixture.componentInstance;
		internals = component as unknown as ChatInternals;
		uiDialog = TestBed.inject(UiDialogService);
		element = fixture.nativeElement as HTMLElement;
		await fixture.whenStable();
		fixture.detectChanges();
	});

	it('creates the chat and loads the available models', () => {
		expect(component).toBeTruthy();
		expect(aiChat.initialize).toHaveBeenCalled();
		expect(aiChat.listModels).toHaveBeenCalled();
		expect(element.querySelector('.model-picker')).toBeTruthy();
	});

	it('renders an inline widget and disables the composer until it is cancelled', async () => {
		const result = uiDialog.ask({ kind: 'text', prompt: 'Your name' });
		fixture.detectChanges();
		await fixture.whenStable();

		expect(element.querySelector('app-ui-dialog')).toBeTruthy();
		expect(composerDisabled()).toBe(true);

		const cancel = findButton('Cancel');
		cancel.click();
		fixture.detectChanges();
		await fixture.whenStable();

		await expect(result).resolves.toBeNull();
		expect(element.querySelector('app-ui-dialog')).toBeFalsy();
		expect(composerDisabled()).toBe(false);
	});

	it('resolves the widget with a submitted value', async () => {
		const result = uiDialog.ask({ kind: 'text', prompt: 'Your name' });
		fixture.detectChanges();

		const input = query('app-ui-dialog input') as HTMLInputElement;
		input.value = 'Alice';
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		findButton('OK').click();
		fixture.detectChanges();
		await fixture.whenStable();

		await expect(result).resolves.toBe('Alice');
		expect(composerDisabled()).toBe(false);
	});

	it('disables the composer while a request is running', async () => {
		let release: () => void = () => undefined;
		aiChat.run.mockReturnValue(
			new Promise<void>((resolve) => {
				release = resolve;
			})
		);
		internals.message = 'Hello';

		const sending = internals.onSend();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(composerDisabled()).toBe(true);
		expect(aiChat.run).toHaveBeenCalledWith(expect.any(Array), 'test-model', expect.any(Function));

		release();
		await sending;
		fixture.detectChanges();
		await fixture.whenStable();

		expect(composerDisabled()).toBe(false);
		expect(globalApi.refreshLoggedInUser).toHaveBeenCalled();
	});

	it('ignores sends while busy or empty', async () => {
		internals.message = '   ';
		await internals.onSend();

		expect(aiChat.run).not.toHaveBeenCalled();
	});

	it('reports a failed request and re-enables the composer', async () => {
		aiChat.run.mockRejectedValueOnce(new Error('offline'));
		internals.message = 'Hello';

		await internals.onSend();
		fixture.detectChanges();

		expect(composerDisabled()).toBe(false);
		expect(snackBar.open).toHaveBeenCalledWith('Error processing messages: offline', 'Close', {
			duration: 5000
		});
	});

	it('adds assistant messages delivered by a running request', async () => {
		aiChat.run.mockImplementationOnce(
			(
				_history: ChatCompletionMessageParam[],
				_model: string,
				onMessage: (message: ChatCompletionMessageParam) => void
			) => {
				onMessage({ role: 'assistant', content: 'Hello from the model' });
			}
		);
		internals.message = 'Hello';

		await internals.onSend();

		expect(internals.sessionData.map((message) => message.content)).toContain(
			'Hello from the model'
		);
	});

	it('ignores assistant messages delivered after the chat is destroyed', async () => {
		aiChat.run.mockImplementationOnce(
			(
				_history: ChatCompletionMessageParam[],
				_model: string,
				onMessage: (message: ChatCompletionMessageParam) => void
			) => {
				internals.ngOnDestroy();
				onMessage({ role: 'assistant', content: 'Too late' });
			}
		);
		internals.message = 'Hello';

		await internals.onSend();

		expect(internals.sessionData.map((message) => message.content)).not.toContain('Too late');
	});

	it('filters empty assistant messages from the visible conversation', () => {
		internals.sessionData = [
			{ role: 'system', content: 'System prompt' },
			{ role: 'assistant', content: '' },
			{ role: 'assistant', content: 'Welcome' },
			{ role: 'tool', tool_call_id: 'call-1', content: 'Result' },
			{ role: 'user', content: 'Hi' }
		];

		expect(internals.visibleMessages).toEqual([
			{ role: 'assistant', content: 'Welcome' },
			{ role: 'user', content: 'Hi' }
		]);
	});

	it('reports initialisation failures', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		aiChat.initialize.mockRejectedValueOnce(new Error('offline'));

		internals.ngOnInit();
		await vi.waitFor(() => {
			expect(snackBar.open).toHaveBeenCalledWith(
				'Error initialising the AI chat: offline',
				'Close',
				{
					duration: 5000
				}
			);
		});

		consoleError.mockRestore();
	});

	it('reports empty and failed model lists', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		aiChat.listModels.mockResolvedValueOnce([]);

		await internals.onRefreshAiAgentModels();

		expect(snackBar.open).toHaveBeenCalledWith(
			'Error loading AI agent models: No AI agent models found',
			'Close',
			{ duration: 5000 }
		);

		aiChat.listModels.mockRejectedValueOnce(new Error('offline'));
		await internals.onRefreshAiAgentModels();

		expect(snackBar.open).toHaveBeenCalledWith('Error loading AI agent models: offline', 'Close', {
			duration: 5000
		});
		consoleError.mockRestore();
	});

	it('reports failures while loading the MCP tool catalog', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		aiChat.listToolGroups.mockRejectedValueOnce(new Error('offline'));

		internals.onDebugModeChange(true);
		await vi.waitFor(() => {
			expect(snackBar.open).toHaveBeenCalledWith('Error loading the MCP tools: offline', 'Close', {
				duration: 5000
			});
		});

		consoleError.mockRestore();
	});

	it('clears the session and hides tool messages unless in debug mode', () => {
		internals.onClear();

		expect(internals.visibleMessages.length).toBe(0);

		internals.debugMode.set(true);
		expect(internals.visibleMessages.length).toBe(1);
	});

	it('shows the MCP tool catalog before the system prompt in debug mode', async () => {
		expect(element.querySelector('app-tool-catalog')).toBeFalsy();

		internals.onDebugModeChange(true);
		await vi.waitFor(() => {
			expect(aiChat.listToolGroups).toHaveBeenCalled();
		});
		fixture.detectChanges();
		await fixture.whenStable();

		expect(element.querySelector('app-tool-catalog')).toBeTruthy();
		const text = element.textContent;
		const catalogIndex = text.indexOf('MCP tool catalog');
		const systemIndex = text.indexOf('System');
		expect(catalogIndex).toBeGreaterThanOrEqual(0);
		expect(systemIndex).toBeGreaterThan(catalogIndex);
		expect(text).toContain('get_todos');
		expect(text).toContain('ui_ask_text');

		internals.onDebugModeChange(false);
		await fixture.whenStable();
		fixture.detectChanges();

		expect(element.querySelector('app-tool-catalog')).toBeFalsy();
	});

	function query(selector: string): Element {
		const node = element.querySelector(selector);
		if (!node) throw new Error(`Element ${selector} not found`);
		return node;
	}

	function composerDisabled(): boolean {
		return (query('textarea') as HTMLTextAreaElement).disabled;
	}

	function findButton(label: string): HTMLButtonElement {
		const buttons = [...element.querySelectorAll('button')] as HTMLButtonElement[];
		const button = buttons.find((candidate) => candidate.textContent.trim() === label);
		if (!button) throw new Error(`Button ${label} not found`);
		return button;
	}
});
