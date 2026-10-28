import { Service } from '@angular/core';

@Service()
export class AppConfiguration {
	readonly apiBaseUrl = '/api';
	readonly currentUserId = 0;

	get aiBaseUrl(): string {
		return new URL('/api/ai', window.location.origin).toString();
	}
	readonly aiApiKey = 'ollama';
	readonly defaultAiModel = 'bonsai-2:2b';
	readonly aiTemperature = 0.2;
	readonly aiSystemPrompt =
		'You are the assistant of a kanban todo application. ' +
		'Use the todo tools to read and modify the signed-in user data. ' +
		'Use the ui_ tools whenever you need a value from the user: prefer ui_ask_select, ' +
		'ui_ask_combobox, ui_ask_date and ui_ask_time over free text for known choices, dates and times. ' +
		'Prefer calling a tool over guessing. Todo statuses are NOT_STARTED, IN_PROGRESS and COMPLETED. ' +
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
