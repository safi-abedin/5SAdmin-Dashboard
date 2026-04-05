import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private activeRequests = 0;
  private showDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly showDelayMs = 300;

  readonly loading$ = this.loadingSubject.asObservable();

  show(): void {
    this.activeRequests += 1;

    if (this.activeRequests === 1) {
      this.startShowDelay();
    }
  }

  hide(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (this.activeRequests === 0) {
      if (this.showDelayTimer) {
        clearTimeout(this.showDelayTimer);
        this.showDelayTimer = null;
      }

      this.loadingSubject.next(false);
    }
  }

  private startShowDelay(): void {
    if (this.showDelayTimer) {
      clearTimeout(this.showDelayTimer);
    }

    this.showDelayTimer = setTimeout(() => {
      this.showDelayTimer = null;
      if (this.activeRequests > 0) {
        this.loadingSubject.next(true);
      }
    }, this.showDelayMs);
  }
}
