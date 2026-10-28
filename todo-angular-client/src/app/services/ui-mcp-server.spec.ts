import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MessageChannelTransport } from '../library/mcp-message-channel-transport';
import type { UiDisplayDialogData, UiInputDialogData, UiInputResult } from '../types/ui-dialog';
import { UiDialogService } from './ui-dialog';
import { UiMcpServer } from './ui-mcp-server';

describe('UiMcpServer', () => {
	let server: UiMcpServer;
	let asked: UiInputDialogData[];
	let shown: UiDisplayDialogData[];
	let nextResult: UiInputResult;

	const ask = vi.fn((data: UiInputDialogData) => {
		asked.push(data);
		return Promise.resolve(nextResult);
	});
	const show = vi.fn((data: UiDisplayDialogData) => {
		shown.push(data);
		return Promise.resolve();
	});

	beforeEach(() => {
		asked = [];
		shown = [];
		nextResult = 'value';
		TestBed.configureTestingModule({
			providers: [
				{
					provide: UiDialogService,
					useValue: { ask, show, closeAll: vi.fn() }
				}
			]
		});
		server = TestBed.inject(UiMcpServer);
	});

	afterEach(async () => {
		await server.close();
		vi.restoreAllMocks();
	});

	it('exposes every UI input and display tool', async () => {
		await server.connect();
		const tools = await server.listTools();

		expect(tools.map((tool) => tool.name).sort()).toEqual(
			[
				'ui_ask_combobox',
				'ui_ask_confirm',
				'ui_ask_date',
				'ui_ask_date_range',
				'ui_ask_multiline',
				'ui_ask_multiselect',
				'ui_ask_number',
				'ui_ask_select',
				'ui_ask_text',
				'ui_ask_time',
				'ui_ask_time_range',
				'ui_show_checklist',
				'ui_show_list',
				'ui_show_message',
				'ui_show_table'
			].sort()
		);
	});

	it('calls every UI input tool through the MCP channel', async () => {
		await server.connect();

		const call = async (name: string, args: Record<string, unknown>) => {
			const result = await server.callTool(name, args);
			const text = result.content.map((item) => (item.type === 'text' ? item.text : '')).join('');
			expect(result.isError).toBeFalsy();
			return text;
		};

		nextResult = 'A';
		expect(
			await call('ui_ask_select', {
				prompt: 'Pick one',
				label: 'Choice',
				options: ['A', 'B'],
				initialValue: 'A'
			})
		).toBe('A');
		expect(asked.at(-1)).toMatchObject({ kind: 'select', options: ['A', 'B'] });

		nextResult = ['A', 'B'];
		expect(
			await call('ui_ask_multiselect', {
				prompt: 'Pick many',
				options: ['A', 'B', 'C'],
				initialValues: ['A']
			})
		).toBe('["A","B"]');
		expect(asked.at(-1)).toMatchObject({ kind: 'multiselect', options: ['A', 'B', 'C'] });

		nextResult = 'custom';
		expect(await call('ui_ask_combobox', { prompt: 'Pick or type', options: ['A', 'B'] })).toBe(
			'custom'
		);
		expect(asked.at(-1)).toMatchObject({ kind: 'combobox', options: ['A', 'B'] });

		nextResult = '42';
		expect(await call('ui_ask_number', { prompt: 'How many?', min: 1, max: 99 })).toBe('42');
		expect(asked.at(-1)).toMatchObject({ kind: 'number', min: 1, max: 99 });

		nextResult = '2026-10-29';
		expect(await call('ui_ask_date', { prompt: 'Pick a date' })).toBe('2026-10-29');
		expect(asked.at(-1)).toMatchObject({ kind: 'date' });

		nextResult = { start: '2026-10-01', end: '2026-10-05' };
		expect(await call('ui_ask_date_range', { prompt: 'Pick a range' })).toBe(
			'{"start":"2026-10-01","end":"2026-10-05"}'
		);
		expect(asked.at(-1)).toMatchObject({ kind: 'date-range' });

		nextResult = '12:30';
		expect(await call('ui_ask_time', { prompt: 'Pick a time' })).toBe('12:30');
		expect(asked.at(-1)).toMatchObject({ kind: 'time' });

		nextResult = { start: '09:00', end: '17:00' };
		expect(await call('ui_ask_time_range', { prompt: 'Pick a time range' })).toBe(
			'{"start":"09:00","end":"17:00"}'
		);
		expect(asked.at(-1)).toMatchObject({ kind: 'time-range' });

		nextResult = 'hello';
		expect(await call('ui_ask_text', { prompt: 'Type text' })).toBe('hello');
		expect(asked.at(-1)).toMatchObject({ kind: 'text' });

		nextResult = 'line one\nline two';
		expect(await call('ui_ask_multiline', { prompt: 'Type more' })).toBe('line one\nline two');
		expect(asked.at(-1)).toMatchObject({ kind: 'multiline' });

		nextResult = true;
		expect(await call('ui_ask_confirm', { prompt: 'Are you sure?' })).toBe('true');
		expect(asked.at(-1)).toMatchObject({ kind: 'confirm' });
	});

	it('calls every UI display tool through the MCP channel', async () => {
		await server.connect();

		const call = async (name: string, args: Record<string, unknown>) => {
			const result = await server.callTool(name, args);
			const text = result.content.map((item) => (item.type === 'text' ? item.text : '')).join('');
			expect(result.isError).toBeFalsy();
			return text;
		};

		expect(await call('ui_show_message', { title: 'Notice', message: 'Saved' })).toBe(
			'Displayed the message to the user.'
		);
		expect(shown.at(-1)).toMatchObject({ kind: 'message', message: 'Saved' });

		expect(
			await call('ui_show_list', { title: 'Todos', items: ['One', 'Two'], ordered: true })
		).toBe('Displayed the list to the user.');
		expect(shown.at(-1)).toMatchObject({ kind: 'list', items: ['One', 'Two'], ordered: true });

		expect(
			await call('ui_show_table', {
				title: 'Todos',
				columns: ['Title', 'Status'],
				rows: [['Buy milk', 'NOT_STARTED']]
			})
		).toBe('Displayed the table to the user.');
		expect(shown.at(-1)).toMatchObject({
			kind: 'table',
			columns: ['Title', 'Status'],
			rows: [['Buy milk', 'NOT_STARTED']]
		});

		expect(
			await call('ui_show_checklist', {
				title: 'Progress',
				items: ['One', 'Two'],
				checked: [true, false]
			})
		).toBe('Displayed the checklist to the user.');
		expect(shown.at(-1)).toMatchObject({
			kind: 'checklist',
			items: ['One', 'Two'],
			checked: [true, false]
		});
	});

	it('reports a cancelled dialog', async () => {
		await server.connect();
		nextResult = null;

		const result = await server.callTool('ui_ask_text', { prompt: 'Type text' });
		const text = result.content.map((item) => (item.type === 'text' ? item.text : '')).join('');

		expect(result.isError).toBeFalsy();
		expect(text).toBe('The user cancelled the input.');
	});

	it('requires a connection before listing or calling tools', async () => {
		await expect(server.listTools()).rejects.toThrow('not connected');
		await expect(server.callTool('ui_ask_text', { prompt: 'Type text' })).rejects.toThrow(
			'not connected'
		);
	});

	it('closes both peers when connecting fails', async () => {
		const serverChannel = fakeChannel(() => Promise.reject(new Error('offline')));
		const clientChannel = fakeChannel(() => Promise.resolve());
		vi.spyOn(MessageChannelTransport, 'createChannelPair').mockReturnValue({
			clientChannel,
			serverChannel
		} as never);

		await expect(server.connect()).rejects.toThrow('offline');

		expect(serverChannel.close).toHaveBeenCalled();
	});

	it('rejects a connection that is closed while connecting', async () => {
		const pending = deferred();
		const pair = MessageChannelTransport.createChannelPair();
		const startServer = pair.serverChannel.start.bind(pair.serverChannel);
		const startSpy = vi.spyOn(pair.serverChannel, 'start').mockImplementation(async () => {
			await pending.promise;
			await startServer();
		});
		vi.spyOn(MessageChannelTransport, 'createChannelPair').mockReturnValue(pair);

		const connecting = server.connect();
		await vi.waitFor(() => {
			expect(startSpy).toHaveBeenCalled();
		});
		const closing = server.close();
		pending.resolve();

		await expect(connecting).rejects.toThrow('closed while connecting');
		await closing;
	});

	function fakeChannel(start: () => Promise<void>) {
		return {
			start: vi.fn(start),
			close: vi.fn().mockResolvedValue(undefined),
			send: vi.fn().mockResolvedValue(undefined),
			setProtocolVersion: vi.fn()
		};
	}

	function deferred(): { promise: Promise<void>; resolve: () => void } {
		let resolve: () => void = () => undefined;
		const promise = new Promise<void>((res) => {
			resolve = res;
		});
		return { promise, resolve };
	}
});
