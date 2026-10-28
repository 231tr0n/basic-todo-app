import { TestBed } from '@angular/core/testing';
import { UiMcpServer } from './ui-mcp-server';

describe('UiMcpServer', () => {
	let server: UiMcpServer;

	beforeEach(() => {
		TestBed.configureTestingModule({});
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
});
