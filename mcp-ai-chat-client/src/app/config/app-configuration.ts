import { Service } from '@angular/core';

/**
 * Single source of truth for client configuration.
 *
 * Services and components inject this class instead of reading scattered constants or defining
 * their own defaults. Override individual values with an Angular provider when a deployment needs
 * different settings.
 */
@Service()
export class AppConfiguration {
	readonly apiBaseUrl = '/api';
	readonly currentUserId = 0;

	readonly aiBaseUrl = '/v1';
	readonly aiApiKey = 'ollama';
	readonly defaultAiModel = '';
	readonly aiSystemPrompt =
		'You are a todo assistant. Use the available MCP tools to read and modify the user data when needed. ' +
		'Prefer calling a tool over guessing. Reply in markdown and summarise the result of every action.';

	readonly mcpClientName = 'todo-ai-chat-client';
	readonly mcpClientVersion = '1.0.0';
	readonly mcpServerName = 'todo-service-mcp-server';
	readonly mcpServerVersion = '1.0.0';

	readonly maxToolIterations = 12;
	readonly maxTextAreaRows = 10;
	readonly snackBarDuration = 5000;
}
