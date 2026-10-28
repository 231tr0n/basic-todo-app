import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface McpToolGroup {
	readonly server: string;
	readonly tools: readonly Tool[];
}

export type ToolCatalogColumn = 'server' | 'tool' | 'description' | 'required';

export interface ToolCatalogRow {
	readonly server: string;
	readonly tool: string;
	readonly description: string;
	readonly required: string;
}

export interface ToolCatalogGroup {
	readonly server: string;
	readonly rows: ToolCatalogRow[];
}
