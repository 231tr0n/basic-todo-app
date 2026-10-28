import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { GlobalApi } from '../services/global-api';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const injector = inject(Injector);
	return next(req).pipe(
		catchError((err: HttpErrorResponse) => {
			if (err.status === 401) {
				injector.get(GlobalApi).clearLoggedInUser();
			}
			return throwError(() => err);
		})
	);
};
