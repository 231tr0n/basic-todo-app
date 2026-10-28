import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { Chat } from './chat';
import { AiChat } from '../../services/ai-chat';

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

		await TestBed.configureTestingModule({
			imports: [Chat],
			providers: [provideRouter([]), { provide: AiChat, useValue: aiChat }]
		}).compileComponents();

		fixture = TestBed.createComponent(Chat);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
