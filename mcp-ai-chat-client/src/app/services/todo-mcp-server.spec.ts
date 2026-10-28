import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TodoMcpServer } from './todo-mcp-server';

describe('TodoMcpServer', () => {
	let server: TodoMcpServer;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		httpMock = TestBed.inject(HttpTestingController);
		server = TestBed.inject(TodoMcpServer);
		httpMock.expectOne('/api/users/0').flush({ id: 0, username: 'test', authorities: [] });
	});

	afterEach(async () => {
		await server.close();
		httpMock.verify();
	});

	it('exposes a tool for every service endpoint', async () => {
		await server.connect();
		const tools = await server.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining([
				'sign_up',
				'sign_in',
				'sign_out',
				'get_users',
				'get_user',
				'update_user',
				'patch_user',
				'delete_user',
				'get_todos',
				'get_todo',
				'create_todo',
				'update_todo',
				'patch_todo',
				'delete_todo',
				'delete_todos'
			])
		);
	});

	it('routes tool calls through the global API', async () => {
		await server.connect();

		const resultPromise = server.callTool('get_todos', {});
		await new Promise((resolve) => setTimeout(resolve, 10));
		httpMock
			.expectOne('/api/users/0/todos')
			.flush([{ id: 1, title: 'Test', status: 'NOT_STARTED' }]);
		const result = await resultPromise;

		const firstContent = result.content[0];
		expect(firstContent.type).toBe('text');
		if (firstContent.type === 'text') {
			expect(firstContent.text).toContain('"id": 1');
		}
	});
});
