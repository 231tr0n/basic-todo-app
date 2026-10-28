import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
	McpToolGroup,
	ToolCatalogColumn,
	ToolCatalogGroup,
	ToolCatalogParameter,
	ToolCatalogRow
} from '../../types/mcp-tools';

type ToolCatalogFilters = Record<ToolCatalogColumn, string>;

const EMPTY_FILTERS: ToolCatalogFilters = {
	server: '',
	tool: '',
	description: '',
	parameters: ''
};

/** A node of the tool input schema, in JSON schema vocabulary. */
interface JsonSchema {
	type?: string | string[];
	description?: string;
	enum?: unknown[];
	items?: JsonSchema;
	anyOf?: JsonSchema[];
	oneOf?: JsonSchema[];
	default?: unknown;
	required?: unknown[];
	properties?: Record<string, unknown>;
}

/** Property keys that render as metadata instead of as the type itself. */
const META_BOUNDS = ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems'];

@Component({
	selector: 'app-tool-catalog',
	imports: [FormsModule, MatFormField, MatIcon, MatInput, MatLabel, MatTableModule],
	templateUrl: './tool-catalog.html',
	styleUrl: './tool-catalog.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolCatalog {
	readonly groups = input.required<readonly McpToolGroup[]>();

	protected readonly displayedColumns: ToolCatalogColumn[] = [
		'server',
		'tool',
		'description',
		'parameters'
	];
	protected readonly filters = signal<ToolCatalogFilters>(EMPTY_FILTERS);
	protected readonly filteredGroups = computed<ToolCatalogGroup[]>(() => {
		const filters = this.filters();
		return this.groups()
			.map((group) => ({
				server: group.server,
				rows: group.tools
					.map((tool) => this.toRow(group.server, tool))
					.filter((row) =>
						this.displayedColumns.every((column) => {
							const value = column === 'parameters' ? row.parameterSummary : row[column];
							return value.toLowerCase().includes(filters[column].toLowerCase());
						})
					)
			}))
			.filter((group) => group.rows.length > 0);
	});

	protected setFilter(column: ToolCatalogColumn, value: string): void {
		this.filters.update((filters) => ({ ...filters, [column]: value }));
	}

	private toRow(server: string, tool: Tool): ToolCatalogRow {
		const schema = this.asJsonSchema(tool.inputSchema) ?? {};
		const parameters = this.toParameters(schema);
		return {
			server,
			tool: tool.name,
			description: tool.description ?? '',
			parameters,
			parameterSummary: parameters
				.map(
					(parameter) =>
						`${parameter.name} ${parameter.kind} ${parameter.required ? 'required' : 'optional'} ${parameter.description}`
				)
				.join('\n')
		};
	}

	private toParameters(schema: JsonSchema): ToolCatalogParameter[] {
		const properties = schema.properties ?? {};
		if (Object.keys(properties).length === 0) return [];
		const required = Array.isArray(schema.required)
			? schema.required.filter((entry): entry is string => typeof entry === 'string')
			: [];
		return Object.entries(properties)
			.map(([name, value]) => ({
				name,
				kind: this.describeType(value),
				required: required.includes(name),
				description: this.describeMetadata(value)
			}))
			.sort((first, second) => {
				if (first.required !== second.required) return first.required ? -1 : 1;
				return first.name.localeCompare(second.name);
			});
	}

	/**
	 * Renders the JSON type of a schema node, including unions, arrays and enums,
	 * falling back to the raw value for anything not described by the usual keys.
	 */
	private describeType(value: unknown): string {
		const schema = this.asJsonSchema(value);
		if (!schema) {
			return typeof value === 'string' ? value : 'unknown';
		}
		const options = schema.anyOf ?? schema.oneOf;
		if (options) return options.map((option) => this.describeType(option)).join(' | ');
		if (schema.enum) return this.describeEnum(schema.enum);
		if (schema.items) return `array of ${this.describeType(schema.items)}`;
		const rawTypes = Array.isArray(schema.type)
			? schema.type
			: schema.type === undefined
				? []
				: [schema.type];
		return rawTypes.length > 0 ? rawTypes.join(' | ') : 'unknown';
	}

	private describeEnum(enumValues: unknown[]): string {
		return enumValues
			.map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
			.join(' | ');
	}

	/** Composes the schema description and the extra metadata into one line. */
	private describeMetadata(value: unknown): string {
		const schema = this.asJsonSchema(value);
		if (!schema) return '';
		const parts: string[] = [];
		if (typeof schema.description === 'string') parts.push(schema.description);
		for (const bound of META_BOUNDS) {
			const limits = schema as Record<string, unknown>;
			if (typeof limits[bound] !== 'number') continue;
			const label = bound.toLowerCase().startsWith('max') ? 'max' : 'min';
			parts.push(`${label} ${String(limits[bound])}`);
		}
		if (schema.enum) parts.push(`one of ${this.describeEnum(schema.enum)}`);
		if (schema.default !== undefined) {
			const rendered =
				typeof schema.default === 'string' ? `'${schema.default}'` : JSON.stringify(schema.default);
			parts.push(`default ${rendered}`);
		}
		return parts.join(', ');
	}

	private asJsonSchema(value: unknown): JsonSchema | null {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
		return value;
	}
}
