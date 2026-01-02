import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Error } from './components/error/error';

export const routes: Routes = [
	{ path: '', component: Home },
	{ path: '**', component: Error }
];
