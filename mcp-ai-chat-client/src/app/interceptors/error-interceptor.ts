import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { GlobalApi } from '../services/global-api';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const globalApi = inject(GlobalApi);
	return next(req).pipe(
		catchError((err: HttpErrorResponse) => {
			if (err.status === HttpStatusCode.Unauthorized.valueOf()) {
				globalApi.loggedInUser.next(null);
			}
			return throwError(() => err);
		})
	);
};
