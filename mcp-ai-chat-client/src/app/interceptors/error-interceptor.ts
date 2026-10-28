import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { GlobalApi } from '../services/global-api';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	// Resolve the API service lazily: GlobalApi creates an HTTP request during construction, so
	// injecting it eagerly here would create a circular dependency.
	const injector = inject(Injector);
	return next(req).pipe(
		catchError((err: HttpErrorResponse) => {
			if (err.status === HttpStatusCode.Unauthorized.valueOf()) {
				injector.get(GlobalApi).loggedInUser.next(null);
			}
			return throwError(() => err);
		})
	);
};
