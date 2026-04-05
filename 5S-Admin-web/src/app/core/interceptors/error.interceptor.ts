import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        toastService.error(resolveMessage(error));
      } else {
        toastService.error('Unexpected error occurred. Please try again.');
      }

      return throwError(() => error);
    })
  );
};

function resolveMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Unable to connect to server.';
  }

  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }

  if (error.error && typeof error.error === 'object' && 'message' in error.error) {
    const message = error.error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return `Request failed (${error.status} ${error.statusText || 'Error'}).`;
}
