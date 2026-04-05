import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastItem, ToastType } from '../models/toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastItem[]>([]);
  private sequence = 0;

  readonly toasts$ = this.toastsSubject.asObservable();

  success(message: string): void {
    this.enqueue('success', message);
  }

  error(message: string): void {
    this.enqueue('error', message);
  }

  warning(message: string): void {
    this.enqueue('warning', message);
  }

  info(message: string): void {
    this.enqueue('info', message);
  }

  dismiss(id: number): void {
    const next = this.toastsSubject.value.filter((toast) => toast.id !== id);
    this.toastsSubject.next(next);
  }

  private enqueue(type: ToastType, message: string): void {
    if (!message.trim()) {
      return;
    }

    const toast: ToastItem = {
      id: ++this.sequence,
      type,
      message: message.trim(),
      durationMs: 4000
    };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.dismiss(toast.id), toast.durationMs);
  }
}
