import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Session } from '../services/session';

const session = inject(Session);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	return next(req).pipe(
		catchError((err: HttpErrorResponse) => {
			if (err.status === HttpStatusCode.Unauthorized.valueOf()) {
				session.loggedInUser.next(null);
			}
			return throwError(() => err);
		})
	);
};
