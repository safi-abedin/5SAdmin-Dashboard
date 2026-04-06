import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  readonly message = signal<string | null>(null);

  setError(message: string): void {
    this.message.set(message);
  }

  clearError(): void {
    this.message.set(null);
  }
}
