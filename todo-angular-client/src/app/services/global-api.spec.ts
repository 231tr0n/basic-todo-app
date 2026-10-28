import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GlobalApi } from './global-api';
import { TodoDto, UserDto } from '../types/types';

describe('GlobalApi', () => {
	let service: GlobalApi;
	let httpMock: HttpTestingController;

	const user: UserDto = { id: 1, username: 'alice', authorities: ['ADMIN'] };
	const todo: TodoDto = {
		id: 1,
		title: 'Todo',
		description: 'Description',
		status: 'NOT_STARTED'
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		service = TestBed.inject(GlobalApi);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('loads the signed-in user on creation and refresh', () => {
		httpMock.expectOne('/api/users/0').flush(user);
		expect(service.loggedInUser.value).toEqual(user);

		service.refreshLoggedInUser();
		httpMock.expectOne('/api/users/0').flush(user);

		service.refreshLoggedInUser();
		httpMock
			.expectOne('/api/users/0')
			.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
		expect(service.loggedInUser.value).toBeNull();
	});

	it('ignores stale user responses', () => {
		const first = httpMock.expectOne('/api/users/0');
		service.refreshLoggedInUser();
		const second = httpMock.expectOne('/api/users/0');

		second.flush(user);
		first.flush({ ...user, username: 'stale' });

		expect(service.loggedInUser.value?.username).toBe('alice');
	});

	it('signs in, creates accounts and signs out', () => {
		httpMock.expectOne('/api/users/0').flush(user);

		service.signIn({ username: 'alice', password: 'secret' }).subscribe();
		const signIn = httpMock.expectOne('/api/signin');
		expect(signIn.request.method).toBe('POST');
		expect(signIn.request.body).toEqual({ username: 'alice', password: 'secret' });
		expect(signIn.request.withCredentials).toBe(true);
		signIn.flush(null);
		httpMock.expectOne('/api/users/0').flush(user);

		service.signUp({ username: 'alice', password: 'secret', authorities: [] }).subscribe();
		const signUp = httpMock.expectOne('/api/signup');
		expect(signUp.request.method).toBe('POST');
		expect(signUp.request.withCredentials).toBe(true);
		signUp.flush(null);

		service.signOut().subscribe();
		const signOut = httpMock.expectOne('/api/signout');
		expect(signOut.request.method).toBe('POST');
		signOut.flush(null);
		expect(service.loggedInUser.value).toBeNull();
	});

	it('covers every user endpoint', () => {
		httpMock.expectOne('/api/users/0').flush(user);

		service.getUser().subscribe();
		const getUser = httpMock.expectOne('/api/users/0');
		expect(getUser.request.method).toBe('GET');
		getUser.flush(user);

		service.getUser(2).subscribe();
		const getOtherUser = httpMock.expectOne('/api/users/2');
		expect(getOtherUser.request.method).toBe('GET');
		getOtherUser.flush(user);

		service.getUsers().subscribe();
		const getUsers = httpMock.expectOne('/api/users');
		expect(getUsers.request.method).toBe('GET');
		getUsers.flush([user]);

		service.updateUser({ username: 'alice' }).subscribe();
		const update = httpMock.expectOne('/api/users/0');
		expect(update.request.method).toBe('PUT');
		expect(update.request.body).toEqual({ username: 'alice' });
		update.flush(null);

		service.updateUser({ authorities: ['ADMIN'] }, 2).subscribe();
		const updateOther = httpMock.expectOne('/api/users/2');
		expect(updateOther.request.method).toBe('PUT');
		updateOther.flush(null);

		service.patchUser({ oldPassword: 'old', newPassword: 'new' }).subscribe();
		const patch = httpMock.expectOne('/api/users/0');
		expect(patch.request.method).toBe('PATCH');
		expect(patch.request.body).toEqual({ oldPassword: 'old', newPassword: 'new' });
		patch.flush(null);

		service.patchUser({ oldPassword: 'old', newPassword: 'new' }, 2).subscribe();
		const patchOther = httpMock.expectOne('/api/users/2');
		expect(patchOther.request.method).toBe('PATCH');
		patchOther.flush(null);

		service.deleteUser().subscribe();
		const deleteSelf = httpMock.expectOne('/api/users/0');
		expect(deleteSelf.request.method).toBe('DELETE');
		deleteSelf.flush(null);

		service.deleteUser(2).subscribe();
		const deleteOther = httpMock.expectOne('/api/users/2');
		expect(deleteOther.request.method).toBe('DELETE');
		deleteOther.flush(null);
	});

	it('covers every todo endpoint', () => {
		httpMock.expectOne('/api/users/0').flush(user);

		service.getTodo(1).subscribe();
		const getTodo = httpMock.expectOne('/api/users/0/todos/1');
		expect(getTodo.request.method).toBe('GET');
		getTodo.flush(todo);

		service.getTodo(1, 2).subscribe();
		const getOtherTodo = httpMock.expectOne('/api/users/2/todos/1');
		expect(getOtherTodo.request.method).toBe('GET');
		getOtherTodo.flush(todo);

		service.getTodos().subscribe();
		const getTodos = httpMock.expectOne('/api/users/0/todos');
		expect(getTodos.request.method).toBe('GET');
		getTodos.flush([todo]);

		service.createTodo({ title: 'Todo', description: 'Description' }).subscribe();
		const create = httpMock.expectOne('/api/users/0/todos');
		expect(create.request.method).toBe('POST');
		expect(create.request.body).toEqual({ title: 'Todo', description: 'Description' });
		create.flush(todo);

		service.createTodo({ title: 'Todo', description: 'Description' }, 2).subscribe();
		const createOther = httpMock.expectOne('/api/users/2/todos');
		expect(createOther.request.method).toBe('POST');
		createOther.flush(todo);

		service.updateTodo({ title: 'Updated' }, 1).subscribe();
		const update = httpMock.expectOne('/api/users/0/todos/1');
		expect(update.request.method).toBe('PUT');
		expect(update.request.body).toEqual({ title: 'Updated' });
		update.flush(null);

		service.updateTodo({ description: 'Updated' }, 1, 2).subscribe();
		const updateOther = httpMock.expectOne('/api/users/2/todos/1');
		expect(updateOther.request.method).toBe('PUT');
		updateOther.flush(null);

		service.patchTodo({ status: 'COMPLETED' }, 1).subscribe();
		const patch = httpMock.expectOne('/api/users/0/todos/1');
		expect(patch.request.method).toBe('PATCH');
		expect(patch.request.body).toEqual({ status: 'COMPLETED' });
		patch.flush(null);

		service.patchTodo({ status: 'COMPLETED' }, 1, 2).subscribe();
		const patchOther = httpMock.expectOne('/api/users/2/todos/1');
		expect(patchOther.request.method).toBe('PATCH');
		patchOther.flush(null);

		service.deleteTodo(1).subscribe();
		const deleteTodo = httpMock.expectOne('/api/users/0/todos/1');
		expect(deleteTodo.request.method).toBe('DELETE');
		deleteTodo.flush(null);

		service.deleteTodo(1, 2).subscribe();
		const deleteOtherTodo = httpMock.expectOne('/api/users/2/todos/1');
		expect(deleteOtherTodo.request.method).toBe('DELETE');
		deleteOtherTodo.flush(null);

		service.deleteTodos().subscribe();
		const deleteAll = httpMock.expectOne('/api/users/0/todos');
		expect(deleteAll.request.method).toBe('DELETE');
		deleteAll.flush(null);

		service.deleteTodos(2).subscribe();
		const deleteOtherAll = httpMock.expectOne('/api/users/2/todos');
		expect(deleteOtherAll.request.method).toBe('DELETE');
		deleteOtherAll.flush(null);
	});

	it('clears the current user without a request', () => {
		httpMock.expectOne('/api/users/0').flush(user);
		service.clearLoggedInUser();
		expect(service.loggedInUser.value).toBeNull();
	});
});
