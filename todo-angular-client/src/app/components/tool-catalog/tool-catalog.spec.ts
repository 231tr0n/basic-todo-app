import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { McpToolGroup } from '../../types/mcp-tools';
import { ToolCatalog } from './tool-catalog';

describe('ToolCatalog', () => {
	let fixture: ComponentFixture<ToolCatalog>;
	let element: HTMLElement;

	const groups: McpToolGroup[] = [
		{
			server: 'Todo MCP server',
			tools: [
				{
					name: 'get_todos',
					description: 'List every todo',
					inputSchema: { type: 'object', required: ['limit'] }
				},
				{
					name: 'delete_todo',
					description: 'Delete a todo',
					inputSchema: { type: 'object', required: [] }
				}
			]
		},
		{
			server: 'UI MCP server',
			tools: [
				{
					name: 'ui_ask_text',
					description: 'Ask the user for text',
					inputSchema: { type: 'object', required: ['prompt'] }
				}
			]
		}
	];

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [ToolCatalog] }).compileComponents();
		fixture = TestBed.createComponent(ToolCatalog);
		fixture.componentRef.setInput('groups', groups);
		fixture.detectChanges();
		element = fixture.nativeElement as HTMLElement;
	});

	it('lists every tool grouped by its MCP server', () => {
		expect(element.textContent).toContain('Todo MCP server');
		expect(element.textContent).toContain('UI MCP server');
		expect(element.textContent).toContain('get_todos');
		expect(element.textContent).toContain('delete_todo');
		expect(element.textContent).toContain('ui_ask_text');
		expect(element.textContent).toContain('List every todo');
		expect(element.textContent).toContain('limit');
		expect(element.textContent).toContain('None');
		expect(rows()).toHaveLength(3);
	});

	it('filters the tools by server', () => {
		filter('server', 'UI');

		expect(element.textContent).toContain('ui_ask_text');
		expect(element.textContent).not.toContain('get_todos');
		expect(element.textContent).not.toContain('Todo MCP server');
	});

	it('filters the tools by name', () => {
		filter('tool', 'delete');

		expect(element.textContent).toContain('delete_todo');
		expect(element.textContent).not.toContain('get_todos');
		expect(element.textContent).not.toContain('ui_ask_text');
	});

	it('filters the tools by description', () => {
		filter('description', 'user for text');

		expect(element.textContent).toContain('ui_ask_text');
		expect(element.textContent).not.toContain('get_todos');
	});

	it('filters the tools by required parameters', () => {
		filter('required', 'prompt');

		expect(element.textContent).toContain('ui_ask_text');
		expect(element.textContent).not.toContain('delete_todo');
	});

	it('shows an empty state when no tools match', () => {
		filter('server', 'missing');
		filter('tool', 'missing');
		filter('description', 'missing');
		filter('required', 'missing');

		expect(rows()).toHaveLength(0);
		expect(element.textContent).toContain('No tools match the filters.');
	});

	function filter(column: 'server' | 'tool' | 'description' | 'required', value: string): void {
		const input = element.querySelector<HTMLInputElement>(`.filter-${column}`);
		if (!input) throw new Error(`Filter ${column} not found`);
		input.value = value;
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();
	}

	function rows(): Element[] {
		return [...element.querySelectorAll('tr.mat-mdc-row')];
	}
});
