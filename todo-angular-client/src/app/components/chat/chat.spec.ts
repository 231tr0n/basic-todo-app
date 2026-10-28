import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { Chat } from './chat';
import { AiChat } from '../../services/ai-chat';
import { GlobalApi } from '../../services/global-api';

describe('Chat', () => {
	let component: Chat;
	let fixture: ComponentFixture<Chat>;

	beforeEach(async () => {
		const aiChat = {
			initialize: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn().mockResolvedValue(undefined),
			listModels: vi.fn().mockResolvedValue(['test-model']),
			run: vi.fn().mockResolvedValue(undefined)
		};
		const globalApi = {
			refreshLoggedInUser: vi.fn()
		};

		await TestBed.configureTestingModule({
			imports: [Chat],
			providers: [
				provideRouter([]),
				{ provide: AiChat, useValue: aiChat },
				{ provide: GlobalApi, useValue: globalApi }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(Chat);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
