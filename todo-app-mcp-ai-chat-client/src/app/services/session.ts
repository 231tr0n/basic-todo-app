import { Injectable } from '@angular/core';
import { UserDto } from '../types/types';
import { BehaviorSubject } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class Session {
	readonly loggedInUser = new BehaviorSubject<UserDto | null>(null);
}
