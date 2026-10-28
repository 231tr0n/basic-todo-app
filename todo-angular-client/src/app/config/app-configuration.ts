import { Service } from '@angular/core';

@Service()
export class AppConfiguration {
	readonly apiBaseUrl = '/api';
	readonly currentUserAliasId = 0;

	get aiBaseUrl(): string {
		return new URL('/api/ai', window.location.origin).toString();
	}
	readonly aiApiKey = 'ollama';
	readonly defaultAiModel = 'bonsai-2:2b';
	readonly aiTemperature = 0.2;
	readonly aiSystemPrompt =
		'You are the assistant of a kanban todo application. ' +
		'Use the Todo MCP tools for every read or mutation of users and todos and never claim an action without a tool call. ' +
		'For every piece of user input you must call the matching UI MCP tool instead of asking in a normal chat message. ' +
		'Use ui_ask_select for a single dropdown choice, ui_ask_multiselect for checkbox selections, ' +
		'ui_ask_combobox when the user may type a custom value, ui_ask_text or ui_ask_multiline for text, ' +
		'ui_ask_number for numbers, ui_ask_date and ui_ask_date_range for dates, ' +
		'ui_ask_time and ui_ask_time_range for times, and ui_ask_confirm before destructive actions. ' +
		'Use ui_show_message, ui_show_list, ui_show_table and ui_show_checklist to present structured output. ' +
		'Always ask for confirmation with ui_ask_confirm before deleting users or todos or changing authorities. ' +
		'Pass user id 0 for the current authenticated user. ' +
		'Todo statuses are NOT_STARTED, IN_PROGRESS and COMPLETED. ' +
		'Reply in markdown and summarise the result of every action.';

	readonly mcpClientName = 'todo-angular-client';
	readonly mcpClientVersion = '1.0.0';
	readonly mcpEndpoint = '/mcp';
	readonly uiMcpServerName = 'todo-ui-mcp-server';
	readonly uiMcpServerVersion = '1.0.0';

	readonly maxToolIterations = 12;
	readonly maxTextAreaRows = 10;
	readonly snackBarDuration = 5000;
}
