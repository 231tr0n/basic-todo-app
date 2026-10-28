import { inject, Service } from '@angular/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AppConfiguration } from '../config/app-configuration';
import { MessageChannelTransport } from '../library/mcp-message-channel-transport';
import { UiInputResult } from '../types/ui-dialog';
import { UiDialogService } from './ui-dialog';

const promptSchema = z.string().min(1).describe('The question or instruction shown to the user.');
const titleSchema = z.string().min(1).describe('The title shown at the top of the dialog.');
const labelSchema = z.string().min(1).optional().describe('The label of the input control.');
const descriptionSchema = z
	.string()
	.optional()
	.describe('Optional helper text displayed below the prompt.');

@Service()
export class UiMcpServer {
	private readonly configuration = inject(AppConfiguration);
	private readonly uiDialog = inject(UiDialogService);

	private server: McpServer | null = null;
	private client: Client | null = null;
	private connecting: Promise<void> | null = null;
	private generation = 0;

	async connect(): Promise<void> {
		if (this.client) return;
		if (this.connecting) return this.connecting;

		const connecting = this.createConnection();
		this.connecting = connecting;
		try {
			await connecting;
		} finally {
			if (this.connecting === connecting) {
				this.connecting = null;
			}
		}
	}

	async close(): Promise<void> {
		this.generation += 1;
		const connecting = this.connecting;
		const client = this.client;
		const server = this.server;
		this.connecting = null;
		this.client = null;
		this.server = null;
		this.uiDialog.closeAll();
		await Promise.allSettled([
			connecting?.catch(() => undefined),
			client?.close(),
			server?.close()
		]);
	}

	async listTools(): Promise<Tool[]> {
		if (!this.client) {
			throw new Error('The UI MCP server is not connected');
		}
		const result = await this.client.listTools();
		return result.tools;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		if (!this.client) {
			throw new Error('The UI MCP server is not connected');
		}
		const result = await this.client.callTool({ name, arguments: args });
		return result as CallToolResult;
	}

	private async createConnection(): Promise<void> {
		const generation = this.generation;
		const server = new McpServer({
			name: this.configuration.uiMcpServerName,
			version: this.configuration.uiMcpServerVersion
		});
		const client = new Client({
			name: this.configuration.mcpClientName,
			version: this.configuration.mcpClientVersion
		});
		const transports = MessageChannelTransport.createChannelPair();
		this.registerTools(server);

		try {
			await server.connect(transports.serverChannel);
			await client.connect(transports.clientChannel);
		} catch (error: unknown) {
			await Promise.allSettled([client.close(), server.close()]);
			throw error;
		}

		if (generation !== this.generation) {
			await Promise.allSettled([client.close(), server.close()]);
			throw new Error('The UI MCP server was closed while connecting');
		}

		this.server = server;
		this.client = client;
	}

	private toResult(value: UiInputResult): CallToolResult {
		if (value === null) {
			return { content: [{ type: 'text', text: 'The user cancelled the input.' }] };
		}
		const text =
			typeof value === 'string'
				? value
				: typeof value === 'boolean'
					? String(value)
					: JSON.stringify(value);
		return { content: [{ type: 'text', text }] };
	}

	private shownResult(kind: string): CallToolResult {
		return { content: [{ type: 'text', text: `Displayed ${kind} to the user.` }] };
	}

	private registerTools(server: McpServer): void {
		this.registerInputTools(server);
		this.registerDisplayTools(server);
	}

	private registerInputTools(server: McpServer): void {
		server.registerTool(
			'ui_ask_select',
			{
				title: 'Ask user to select one option',
				description:
					'Show a dropdown of known options and let the user pick exactly one. Use this instead of free text when the possible values are known.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema,
					options: z
						.array(z.string().min(1))
						.min(1)
						.describe('The options the user can choose from.'),
					initialValue: z.string().optional().describe('The option selected when the dialog opens.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description, options, initialValue }) =>
				this.toResult(
					await this.uiDialog.ask({
						kind: 'select',
						prompt,
						label,
						description,
						options,
						initialValue
					})
				)
		);

		server.registerTool(
			'ui_ask_multiselect',
			{
				title: 'Ask user to select multiple options',
				description:
					'Show a checkbox list and let the user select any number of known options. Returns a JSON array.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema,
					options: z
						.array(z.string().min(1))
						.min(1)
						.describe('The options the user can select from.'),
					initialValues: z
						.array(z.string())
						.optional()
						.describe('The options selected when the dialog opens.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description, options, initialValues }) =>
				this.toResult(
					await this.uiDialog.ask({
						kind: 'multiselect',
						prompt,
						label,
						description,
						options,
						initialValues
					})
				)
		);

		server.registerTool(
			'ui_ask_combobox',
			{
				title: 'Ask user to pick or type a value',
				description:
					'Show an autocomplete combobox with suggestions while still allowing the user to type a custom value.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema,
					options: z
						.array(z.string().min(1))
						.min(1)
						.describe('The suggested values shown by the autocomplete.'),
					initialValue: z.string().optional().describe('The initial input value.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description, options, initialValue }) =>
				this.toResult(
					await this.uiDialog.ask({
						kind: 'combobox',
						prompt,
						label,
						description,
						options,
						initialValue
					})
				)
		);

		server.registerTool(
			'ui_ask_text',
			{
				title: 'Ask user for text',
				description: 'Show a single-line text input and return the entered value.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema,
					initialValue: z.string().optional().describe('The initial input value.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description, initialValue }) =>
				this.toResult(
					await this.uiDialog.ask({
						kind: 'text',
						prompt,
						label,
						description,
						initialValue
					})
				)
		);

		server.registerTool(
			'ui_ask_multiline',
			{
				title: 'Ask user for multi-line text',
				description: 'Show a multi-line text area and return the entered value.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema,
					initialValue: z.string().optional().describe('The initial input value.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description, initialValue }) =>
				this.toResult(
					await this.uiDialog.ask({
						kind: 'multiline',
						prompt,
						label,
						description,
						initialValue
					})
				)
		);

		server.registerTool(
			'ui_ask_number',
			{
				title: 'Ask user for a number',
				description: 'Show a numeric input with optional minimum and maximum bounds.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema,
					min: z.number().optional().describe('The smallest accepted value.'),
					max: z.number().optional().describe('The largest accepted value.'),
					initialValue: z.number().optional().describe('The initial numeric value.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description, min, max, initialValue }) =>
				this.toResult(
					await this.uiDialog.ask({
						kind: 'number',
						prompt,
						label,
						description,
						min,
						max,
						initialValue: initialValue?.toString()
					})
				)
		);

		server.registerTool(
			'ui_ask_date',
			{
				title: 'Ask user for a date',
				description: 'Show a date picker and return the selected date in ISO format (YYYY-MM-DD).',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description }) =>
				this.toResult(await this.uiDialog.ask({ kind: 'date', prompt, label, description }))
		);

		server.registerTool(
			'ui_ask_date_range',
			{
				title: 'Ask user for a date range',
				description:
					'Show start and end date pickers and return JSON with start and end dates in ISO format.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description }) =>
				this.toResult(await this.uiDialog.ask({ kind: 'date-range', prompt, label, description }))
		);

		server.registerTool(
			'ui_ask_time',
			{
				title: 'Ask user for a time',
				description: 'Show a time input and return the selected time in 24-hour HH:mm format.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description }) =>
				this.toResult(await this.uiDialog.ask({ kind: 'time', prompt, label, description }))
		);

		server.registerTool(
			'ui_ask_time_range',
			{
				title: 'Ask user for a time range',
				description:
					'Show start and end time inputs and return JSON with start and end times in 24-hour HH:mm format.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					description: descriptionSchema
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, description }) =>
				this.toResult(await this.uiDialog.ask({ kind: 'time-range', prompt, label, description }))
		);

		server.registerTool(
			'ui_ask_confirm',
			{
				title: 'Ask user to confirm an action',
				description: 'Ask the user to confirm or cancel a potentially destructive action.',
				inputSchema: {
					prompt: promptSchema,
					description: descriptionSchema
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, description }) =>
				this.toResult(await this.uiDialog.ask({ kind: 'confirm', prompt, description }))
		);
	}

	private registerDisplayTools(server: McpServer): void {
		server.registerTool(
			'ui_show_message',
			{
				title: 'Show a message',
				description: 'Show a read-only message dialog to the user.',
				inputSchema: {
					title: titleSchema,
					message: z.string().min(1).describe('The message to display.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ title, message }) => {
				await this.uiDialog.show({ kind: 'message', title, message });
				return this.shownResult('the message');
			}
		);

		server.registerTool(
			'ui_show_list',
			{
				title: 'Show a list',
				description: 'Show a read-only ordered or unordered list to the user.',
				inputSchema: {
					title: titleSchema,
					items: z.array(z.string().min(1)).min(1).describe('The list items.'),
					ordered: z.boolean().optional().describe('Whether the list is numbered.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ title, items, ordered }) => {
				await this.uiDialog.show({ kind: 'list', title, items, ordered });
				return this.shownResult('the list');
			}
		);

		server.registerTool(
			'ui_show_table',
			{
				title: 'Show a table',
				description: 'Show a read-only table with the supplied column headers and rows.',
				inputSchema: {
					title: titleSchema,
					columns: z.array(z.string().min(1)).min(1).describe('The table column headers.'),
					rows: z
						.array(z.array(z.string()))
						.min(1)
						.describe('The table rows. Every row should contain one cell per column.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ title, columns, rows }) => {
				await this.uiDialog.show({ kind: 'table', title, columns, rows });
				return this.shownResult('the table');
			}
		);

		server.registerTool(
			'ui_show_checklist',
			{
				title: 'Show a checklist',
				description: 'Show a read-only checklist with optional checked states.',
				inputSchema: {
					title: titleSchema,
					items: z.array(z.string().min(1)).min(1).describe('The checklist items.'),
					checked: z
						.array(z.boolean())
						.optional()
						.describe('The checked state for each item, in the same order.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ title, items, checked }) => {
				await this.uiDialog.show({ kind: 'checklist', title, items, checked });
				return this.shownResult('the checklist');
			}
		);
	}
}
