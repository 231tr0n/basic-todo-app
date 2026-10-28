import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { UiInputDialogData, UiInputResult } from '../types/ui-input';
import { UiInputService } from './ui-input';
import { UiMcpServer } from './ui-mcp-server';

describe('UiMcpServer', () => {
	let server: UiMcpServer;
	let asked: UiInputDialogData[];
	let nextResult: UiInputResult;

	const ask = vi.fn((data: UiInputDialogData) => {
		asked.push(data);
		return Promise.resolve(nextResult);
	});

	beforeEach(() => {
		asked = [];
		nextResult = 'value';
		TestBed.configureTestingModule({
			providers: [
				{
					provide: UiInputService,
					useValue: { ask, closeAll: vi.fn() }
				}
			]
		});
		server = TestBed.inject(UiMcpServer);
	});

	afterEach(async () => {
		await server.close();
	});

	it('exposes a tool for every UI input control', async () => {
		await server.connect();
		const tools = await server.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining([
				'ui_ask_select',
				'ui_ask_combobox',
				'ui_ask_date',
				'ui_ask_time',
				'ui_ask_text',
				'ui_ask_multiline',
				'ui_ask_confirm'
			])
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

		nextResult = 'custom';
		expect(await call('ui_ask_combobox', { prompt: 'Pick or type', options: ['A', 'B'] })).toBe(
			'custom'
		);
		expect(asked.at(-1)).toMatchObject({ kind: 'combobox', options: ['A', 'B'] });

		nextResult = '2026-10-29';
		expect(await call('ui_ask_date', { prompt: 'Pick a date' })).toBe('2026-10-29');
		expect(asked.at(-1)).toMatchObject({ kind: 'date' });

		nextResult = '12:30';
		expect(await call('ui_ask_time', { prompt: 'Pick a time' })).toBe('12:30');
		expect(asked.at(-1)).toMatchObject({ kind: 'time' });

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

	it('reports a cancelled dialog', async () => {
		await server.connect();
		nextResult = null;

		const result = await server.callTool('ui_ask_text', { prompt: 'Type text' });
		const text = result.content.map((item) => (item.type === 'text' ? item.text : '')).join('');

		expect(result.isError).toBeFalsy();
		expect(text).toBe('The user cancelled the input.');
	});
});
