import { Injectable } from '@angular/core';
import { UserDto } from '../types/types';
import { Subject } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class Session {
	readonly loggedInUser = new Subject<UserDto | null>();
}
