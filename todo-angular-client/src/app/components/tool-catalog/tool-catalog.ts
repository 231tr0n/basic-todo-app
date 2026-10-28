import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
	McpToolGroup,
	ToolCatalogColumn,
	ToolCatalogGroup,
	ToolCatalogRow
} from '../../types/mcp-tools';

@Component({
	selector: 'app-tool-catalog',
	imports: [FormsModule, MatFormField, MatInput, MatLabel, MatTableModule],
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
		'required'
	];
	protected readonly filters: Record<ToolCatalogColumn, string> = {
		server: '',
		tool: '',
		description: '',
		required: ''
	};
	protected readonly filteredGroups = computed<ToolCatalogGroup[]>(() => {
		this.filterRevision();
		const filters = this.filters;
		return this.groups()
			.map((group) => ({
				server: group.server,
				rows: group.tools
					.map((tool) => this.toRow(group.server, tool))
					.filter((row) =>
						this.displayedColumns.every((column) =>
							row[column].toLowerCase().includes(filters[column].toLowerCase())
						)
					)
			}))
			.filter((group) => group.rows.length > 0);
	});

	private readonly filterRevision = signal(0);

	protected applyFilters(): void {
		this.filterRevision.update((revision) => revision + 1);
	}

	private toRow(server: string, tool: Tool): ToolCatalogRow {
		const required = this.requiredParameters(tool.inputSchema);
		return {
			server,
			tool: tool.name,
			description: tool.description ?? '',
			required: required.length > 0 ? required.join(', ') : 'None'
		};
	}

	private requiredParameters(schema: unknown): string[] {
		if (typeof schema !== 'object' || schema === null || !('required' in schema)) return [];
		const required = (schema as { required?: unknown }).required;
		if (!Array.isArray(required)) return [];
		return required.filter((value): value is string => typeof value === 'string');
	}
}
