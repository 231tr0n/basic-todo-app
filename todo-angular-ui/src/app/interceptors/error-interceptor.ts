import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Session } from '../services/session';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const session = inject(Session);
	return next(req).pipe(
		catchError((err: HttpErrorResponse) => {
			if (err.status === HttpStatusCode.Unauthorized.valueOf()) {
				session.loggedInUser.next(null);
			}
			return throwError(() => err);
		})
	);
};
