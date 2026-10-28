import { inject, Service } from '@angular/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { firstValueFrom, Observable } from 'rxjs';
import { z } from 'zod';
import { AppConfiguration } from '../config/app-configuration';
import { MessageChannelTransport } from '../library/mcp-message-channel-transport';
import { GlobalApi } from './global-api';

const userIdSchema = z
	.number()
	.int()
	.positive()
	.optional()
	.describe('Target user id. Omit this to use the currently signed-in user.');

const todoIdSchema = z.number().int().positive().describe('The id of the todo.');

/**
 * In-browser MCP server that exposes every backend service endpoint as an MCP tool.
 *
 * The chat client talks to this server through an in-memory {@link MessageChannelTransport}, so
 * the AI never needs direct knowledge of the REST API. The MCP client discovers the tools and the
 * chat service invokes them by name.
 */
@Service()
export class TodoMcpServer {
	private readonly configuration = inject(AppConfiguration);
	private readonly globalApi = inject(GlobalApi);

	private server: McpServer | null = null;
	private client: Client | null = null;
	private connected = false;
	private connecting: Promise<void> | null = null;

	async connect() {
		if (this.connected) return;
		if (this.connecting) return this.connecting;
		this.connecting = this.createConnection();
		try {
			await this.connecting;
		} finally {
			this.connecting = null;
		}
	}

	private async createConnection() {
		const server = new McpServer({
			name: this.configuration.mcpServerName,
			version: this.configuration.mcpServerVersion
		});
		const client = new Client({
			name: this.configuration.mcpClientName,
			version: this.configuration.mcpClientVersion
		});
		const transports = MessageChannelTransport.createChannelPair();
		this.server = server;
		this.client = client;
		this.registerTools(server);
		await server.connect(transports.serverChannel);
		await client.connect(transports.clientChannel);
		this.connected = true;
	}

	async close() {
		const client = this.client;
		const server = this.server;
		this.client = null;
		this.server = null;
		this.connected = false;
		this.connecting = null;
		await Promise.allSettled([client?.close(), server?.close()]);
	}

	async listTools(): Promise<Tool[]> {
		if (!this.client) {
			throw new Error('The MCP server is not connected');
		}
		const result = await this.client.listTools();
		return result.tools;
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		if (!this.client) {
			throw new Error('The MCP server is not connected');
		}
		const result = await this.client.callTool({ name, arguments: args });
		return result as CallToolResult;
	}

	private async execute(request: () => Observable<unknown>): Promise<CallToolResult> {
		try {
			const result = await firstValueFrom(request());
			return {
				content: [{ type: 'text', text: this.serialize(result) }]
			};
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: 'text', text: `Request failed: ${message}` }],
				isError: true
			};
		}
	}

	private serialize(value: unknown): string {
		if (value === undefined || value === null) return 'OK';
		if (typeof value === 'string') return value;
		return JSON.stringify(value, null, 2);
	}

	private registerTools(server: McpServer) {
		server.registerTool(
			'sign_up',
			{
				title: 'Sign up',
				description: 'Create a new user account.',
				inputSchema: {
					username: z.string().min(1).max(255).describe('The new username.'),
					password: z.string().min(1).max(255).describe('The new password.'),
					authorities: z
						.array(z.string().min(1).max(255))
						.max(10)
						.optional()
						.describe('Optional authorities, for example ["ADMIN"].')
				},
				annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false }
			},
			({ username, password, authorities }) =>
				this.execute(() =>
					this.globalApi.signUp({ username, password, authorities: authorities ?? [] })
				)
		);

		server.registerTool(
			'sign_in',
			{
				title: 'Sign in',
				description: 'Sign in with an existing username and password.',
				inputSchema: {
					username: z.string().min(1).max(255).describe('The username.'),
					password: z.string().min(1).max(255).describe('The password.')
				},
				annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false }
			},
			({ username, password }) => this.execute(() => this.globalApi.signIn({ username, password }))
		);

		server.registerTool(
			'sign_out',
			{
				title: 'Sign out',
				description: 'Sign the current user out.',
				annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false }
			},
			() => this.execute(() => this.globalApi.signOut())
		);

		server.registerTool(
			'get_users',
			{
				title: 'List users',
				description:
					'List users visible to the current user. Admins receive every user; other users receive themselves.',
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			() => this.execute(() => this.globalApi.getUsers())
		);

		server.registerTool(
			'get_user',
			{
				title: 'Get user',
				description: 'Get a single user by id. Omit the id to get the current user.',
				inputSchema: { userId: userIdSchema },
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			({ userId }) => this.execute(() => this.globalApi.getUser(userId))
		);

		server.registerTool(
			'update_user',
			{
				title: 'Update user',
				description: 'Replace a user username and/or authorities.',
				inputSchema: {
					userId: userIdSchema,
					username: z.string().min(1).max(255).optional().describe('The new username.'),
					authorities: z
						.array(z.string().min(1).max(255))
						.max(10)
						.optional()
						.describe('The complete replacement list of authorities.')
				},
				annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false }
			},
			({ userId, username, authorities }) =>
				this.execute(() =>
					this.globalApi.updateUser(
						{
							...(username !== undefined ? { username } : {}),
							...(authorities !== undefined ? { authorities } : {})
						},
						userId
					)
				)
		);

		server.registerTool(
			'patch_user',
			{
				title: 'Change password',
				description: 'Change the password of a user by supplying the old and new password.',
				inputSchema: {
					userId: userIdSchema,
					oldPassword: z.string().min(1).max(255).describe('The current password.'),
					newPassword: z.string().min(1).max(255).describe('The new password.')
				},
				annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: false }
			},
			({ userId, oldPassword, newPassword }) =>
				this.execute(() => this.globalApi.patchUser({ oldPassword, newPassword }, userId))
		);

		server.registerTool(
			'delete_user',
			{
				title: 'Delete user',
				description: 'Delete a user by id. Omit the id to delete the current user.',
				inputSchema: { userId: userIdSchema },
				annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false }
			},
			({ userId }) => this.execute(() => this.globalApi.deleteUser(userId))
		);

		server.registerTool(
			'get_todos',
			{
				title: 'List todos',
				description: 'List every todo belonging to a user.',
				inputSchema: { userId: userIdSchema },
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			({ userId }) => this.execute(() => this.globalApi.getTodos(userId))
		);

		server.registerTool(
			'get_todo',
			{
				title: 'Get todo',
				description: 'Get a single todo by id.',
				inputSchema: { todoId: todoIdSchema, userId: userIdSchema },
				annotations: { readOnlyHint: true, openWorldHint: false }
			},
			({ todoId, userId }) => this.execute(() => this.globalApi.getTodo(todoId, userId))
		);

		server.registerTool(
			'create_todo',
			{
				title: 'Create todo',
				description: 'Create a todo for a user. New todos start with status NOT_STARTED.',
				inputSchema: {
					userId: userIdSchema,
					title: z.string().min(1).max(255).describe('The todo title.'),
					description: z.string().min(1).max(255).describe('The todo description.')
				},
				annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false }
			},
			({ userId, title, description }) =>
				this.execute(() => this.globalApi.createTodo({ title, description }, userId))
		);

		server.registerTool(
			'update_todo',
			{
				title: 'Update todo',
				description: 'Replace the title and/or description of a todo.',
				inputSchema: {
					todoId: todoIdSchema,
					userId: userIdSchema,
					title: z.string().min(1).max(255).optional().describe('The new title.'),
					description: z.string().min(1).max(255).optional().describe('The new description.')
				},
				annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false }
			},
			({ todoId, userId, title, description }) =>
				this.execute(() =>
					this.globalApi.updateTodo(
						{
							...(title !== undefined ? { title } : {}),
							...(description !== undefined ? { description } : {})
						},
						todoId,
						userId
					)
				)
		);

		server.registerTool(
			'patch_todo',
			{
				title: 'Change todo status',
				description: 'Change the status of a todo.',
				inputSchema: {
					todoId: todoIdSchema,
					userId: userIdSchema,
					status: z
						.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
						.describe('The new todo status.')
				},
				annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false }
			},
			({ todoId, userId, status }) =>
				this.execute(() => this.globalApi.patchTodo({ status }, todoId, userId))
		);

		server.registerTool(
			'delete_todo',
			{
				title: 'Delete todo',
				description: 'Delete a single todo by id.',
				inputSchema: { todoId: todoIdSchema, userId: userIdSchema },
				annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false }
			},
			({ todoId, userId }) => this.execute(() => this.globalApi.deleteTodo(todoId, userId))
		);

		server.registerTool(
			'delete_todos',
			{
				title: 'Delete all todos',
				description: 'Delete every todo belonging to a user.',
				inputSchema: { userId: userIdSchema },
				annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false }
			},
			({ userId }) => this.execute(() => this.globalApi.deleteTodos(userId))
		);

		server.registerTool(
			'eval_javascript',
			{
				title: 'Evaluate JavaScript',
				description:
					'Evaluate a JavaScript expression in the browser and return its result. Useful for calculations and data transformations.',
				inputSchema: {
					expression: z.string().describe('The JavaScript expression to evaluate.')
				},
				annotations: { readOnlyHint: true, openWorldHint: true }
			},
			({ expression }) => this.execute(() => this.evaluate(expression))
		);
	}

	private evaluate(expression: string): Observable<string> {
		return new Observable<string>((subscriber) => {
			try {
				subscriber.next(String((0, eval)(expression)));
				subscriber.complete();
			} catch (error: unknown) {
				subscriber.error(error);
			}
		});
	}
}
