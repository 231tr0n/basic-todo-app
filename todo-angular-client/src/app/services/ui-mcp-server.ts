import { inject, Service } from '@angular/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AppConfiguration } from '../config/app-configuration';
import { MessageChannelTransport } from '../library/mcp-message-channel-transport';
import { UiInputResult } from '../types/ui-input';
import { UiInputService } from './ui-input';

const promptSchema = z.string().min(1).describe('The question or instruction shown to the user.');
const labelSchema = z.string().min(1).optional().describe('The label of the input control.');
const descriptionSchema = z
	.string()
	.optional()
	.describe('Optional helper text displayed below the prompt.');

@Service()
export class UiMcpServer {
	private readonly configuration = inject(AppConfiguration);
	private readonly uiInput = inject(UiInputService);

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
		this.uiInput.closeAll();
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
		return {
			content: [{ type: 'text', text: typeof value === 'boolean' ? String(value) : value }]
		};
	}

	private registerTools(server: McpServer): void {
		server.registerTool(
			'ui_ask_select',
			{
				title: 'Ask user to select an option',
				description:
					'Show a dropdown of known options and let the user pick exactly one. Use this instead of free text when the possible values are known.',
				inputSchema: {
					prompt: promptSchema,
					label: labelSchema,
					options: z
						.array(z.string().min(1))
						.min(1)
						.describe('The options the user can choose from.'),
					initialValue: z.string().optional().describe('The option selected when the dialog opens.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, options, initialValue }) =>
				this.toResult(
					await this.uiInput.ask({
						kind: 'select',
						prompt,
						label,
						options,
						initialValue
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
					options: z
						.array(z.string().min(1))
						.min(1)
						.describe('The suggested values shown by the autocomplete.'),
					initialValue: z.string().optional().describe('The initial input value.')
				},
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			async ({ prompt, label, options, initialValue }) =>
				this.toResult(
					await this.uiInput.ask({
						kind: 'combobox',
						prompt,
						label,
						options,
						initialValue
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
				this.toResult(await this.uiInput.ask({ kind: 'date', prompt, label, description }))
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
				this.toResult(await this.uiInput.ask({ kind: 'time', prompt, label, description }))
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
					await this.uiInput.ask({
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
					await this.uiInput.ask({
						kind: 'multiline',
						prompt,
						label,
						description,
						initialValue
					})
				)
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
				this.toResult(await this.uiInput.ask({ kind: 'confirm', prompt, description }))
		);
	}
}
