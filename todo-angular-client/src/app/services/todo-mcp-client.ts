import { inject, Service } from '@angular/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AppConfiguration } from '../config/app-configuration';

@Service()
export class TodoMcpClient {
	private readonly configuration = inject(AppConfiguration);

	private client: Client | null = null;
	private connecting: Promise<Client> | null = null;
	private generation = 0;

	async connect(): Promise<void> {
		await this.getClient();
	}

	async close(): Promise<void> {
		this.generation += 1;
		const connecting = this.connecting;
		const client = this.client;
		this.connecting = null;
		this.client = null;
		await Promise.allSettled([connecting?.catch(() => undefined), client?.close()]);
	}

	async listTools(): Promise<Tool[]> {
		const client = await this.getClient();
		const result = await client.listTools();
		return result.tools;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		const client = await this.getClient();
		const result = await client.callTool({ name, arguments: args });
		return result as CallToolResult;
	}

	private async getClient(): Promise<Client> {
		if (this.client) return this.client;
		if (this.connecting) return this.connecting;

		const generation = this.generation;
		const connecting = this.openClient(generation);
		this.connecting = connecting;
		try {
			return await connecting;
		} finally {
			if (this.connecting === connecting) {
				this.connecting = null;
			}
		}
	}

	private async openClient(generation: number): Promise<Client> {
		const client = await this.createClient();
		if (generation !== this.generation) {
			await client.close().catch(() => undefined);
			throw new Error('The MCP client was closed while connecting');
		}
		this.client = client;
		return client;
	}

	private async createClient(): Promise<Client> {
		const transport = new StreamableHTTPClientTransport(
			new URL(this.configuration.mcpEndpoint, window.location.origin),
			{ requestInit: { credentials: 'include' } }
		);
		const client = new Client({
			name: this.configuration.mcpClientName,
			version: this.configuration.mcpClientVersion
		});
		try {
			await client.connect(transport);
			return client;
		} catch (error: unknown) {
			await client.close().catch(() => undefined);
			throw error;
		}
	}
}
