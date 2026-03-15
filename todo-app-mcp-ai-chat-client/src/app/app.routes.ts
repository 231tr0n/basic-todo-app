import { Routes } from '@angular/router';
import { Chat } from './components/chat/chat';
import { Error } from './components/error/error';

export const routes: Routes = [
	{ path: '', component: Chat },
	{ path: '**', component: Error }
];
