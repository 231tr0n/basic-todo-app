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
					inputSchema: {
						type: 'object',
						properties: {
							limit: {
								type: 'number',
								minimum: 1,
								maximum: 99,
								description: 'How many todos to list'
							},
							sort: { type: 'string', enum: ['ASC', 'DESC'] }
						},
						required: ['limit']
					}
				},
				{
					name: 'delete_todo',
					description: 'Delete a todo',
					inputSchema: { type: 'object' }
				}
			]
		},
		{
			server: 'UI MCP server',
			tools: [
				{
					name: 'ui_ask_text',
					description: 'Ask the user for text',
					inputSchema: {
						type: 'object',
						properties: {
							prompt: {
								type: 'string',
								description: 'The question or instruction shown to the user.'
							},
							initialValue: { type: 'string', default: 'Alice' }
						},
						required: ['prompt']
					}
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
		expect(element.querySelectorAll('.parameter-table')).toHaveLength(2);
		expect(rows()).toHaveLength(3);
	});

	it('renders each parameter with its type, requirement and metadata', () => {
		const table = firstParameterTable();

		const text = table.textContent;
		expect(text).toContain('limit');
		expect(text).toContain('number');
		expect(text).toContain('required');
		expect(text).toContain('How many todos to list');
		// Bounds, enum values and defaults surface as metadata next to the descriptions.
		expect(text).toContain('min 1');
		expect(text).toContain('max 99');
		expect(text).toContain('one of ASC | DESC');
		expect(text).toContain('optional');
		expect(text).toContain('sort');
	});

	it('describes unions, arrays, bounds and numeric enums from complex schemas', () => {
		const complex: McpToolGroup[] = [
			{
				server: 'UI MCP server',
				tools: [
					{
						name: 'ui_complex',
						description: 'A complex schema',
						inputSchema: {
							type: 'object',
							properties: {
								mode: {
									anyOf: [{ type: 'string' }, { type: 'number' }],
									description: 'Two accepted kinds'
								},
								scale: {
									oneOf: [{ type: 'string' }, { type: 'boolean' }]
								},
								tags: { type: 'array', items: { type: 'string' } },
								nullable: { type: ['string', 'null'] },
								name: { type: 'string', minLength: 2, maxLength: 8 },
								priority: { enum: [1, 2, 3], description: 'Urgency level' },
								anything: { description: 'Anything goes' }
							},
							required: ['mode', 'name']
						}
					}
				]
			}
		];
		fixture.componentRef.setInput('groups', complex);
		fixture.detectChanges();

		const table = firstParameterTable();
		const text = table.textContent;

		expect(text).toContain('string | number');
		expect(text).toContain('Two accepted kinds');
		expect(text).toContain('string | boolean');
		expect(text).toContain('array of string');
		expect(text).toContain('string | null');
		expect(text).toContain('min 2, max 8');
		expect(text).toContain('Urgency level, one of 1 | 2 | 3');
		expect(text).toContain('unknown');
		// Required parameters sort ahead of optional ones, each sorted by name.
		expect(text.indexOf('anything')).toBeGreaterThan(text.indexOf('mode'));
	});

	it('lists required parameters before optional ones, both by name', () => {
		const table = firstParameterTable();
		const text = table.textContent;

		const limitRow = text.indexOf('limit');
		const sortRow = text.indexOf('sort');
		expect(limitRow).toBeGreaterThanOrEqual(0);
		expect(sortRow).toBeGreaterThan(limitRow);

		const rowsInTable = [...table.querySelectorAll('tr.parameter')].map((row) => row.textContent);
		expect(rowsInTable).toHaveLength(2);
		expect(rowsInTable[0] ?? '').toContain('required');
		expect(rowsInTable[1] ?? '').toContain('optional');
	});

	it('describes defaults and descriptions for optional parameters', () => {
		const tables = [...element.querySelectorAll('.parameter-table')];
		const text = tables.map((table) => table.textContent).join('\n');
		expect(text).toContain('The question or instruction shown to the user.');
		expect(text).toContain("default 'Alice'");
	});

	it('falls back to a none placeholder for tools without parameters', () => {
		const deleteRow = rows()[1];
		expect(deleteRow.textContent).toContain('None');
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

	it('filters the tools by parameter schema content', () => {
		filter('parameter', 'How many todos');

		expect(element.textContent).toContain('get_todos');
		expect(element.textContent).not.toContain('delete_todo');
		expect(element.textContent).not.toContain('ui_ask_text');
	});

	it('shows an empty state when no tools match', () => {
		filter('server', 'missing');
		filter('tool', 'missing');
		filter('description', 'missing');
		filter('parameter', 'missing');

		expect(rows()).toHaveLength(0);
		expect(element.textContent).toContain('No tools match the filters.');
	});

	function filter(column: 'server' | 'tool' | 'description' | 'parameter', value: string): void {
		const input = element.querySelector<HTMLInputElement>(`.filter-${column}`);
		if (!input) throw new Error(`Filter ${column} not found`);
		input.value = value;
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();
	}

	function rows(): Element[] {
		return [...element.querySelectorAll('tr.mat-mdc-row')];
	}

	function firstParameterTable(): HTMLTableElement {
		const table = element.querySelector('.parameter-table');
		if (!table) throw new Error('No parameter table rendered');
		return table as HTMLTableElement;
	}
});
