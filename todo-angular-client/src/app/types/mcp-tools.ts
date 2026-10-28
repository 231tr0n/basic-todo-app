import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface McpToolGroup {
	readonly server: string;
	readonly tools: readonly Tool[];
}

export type ToolCatalogColumn = 'server' | 'tool' | 'description' | 'parameters';

/** One input schema property of a tool, presented in a structured row. */
export interface ToolCatalogParameter {
	readonly name: string;
	/** The JSON schema type(s) of the parameter, e.g. `string`, `number`, `array of string`. */
	readonly kind: string;
	readonly required: boolean;
	/** The schema description plus additional metadata such as bounds, enum values or defaults. */
	readonly description: string;
}

export interface ToolCatalogRow {
	readonly server: string;
	readonly tool: string;
	readonly description: string;
	readonly parameters: readonly ToolCatalogParameter[];
	/** Concatenated parameter summary shown nowhere but matched against the filter. */
	readonly parameterSummary: string;
}

export interface ToolCatalogGroup {
	readonly server: string;
	readonly rows: ToolCatalogRow[];
}
