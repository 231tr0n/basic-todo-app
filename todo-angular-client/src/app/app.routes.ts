import { Routes } from '@angular/router';
import { Board } from './components/board/board';
import { Chat } from './components/chat/chat';
import { Error } from './components/error/error';

export const routes: Routes = [
	{ path: '', component: Board },
	{ path: 'chat', component: Chat },
	{ path: '**', component: Error }
];
