import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-indicator',
  imports: [AsyncPipe, NgOptimizedImage],
  template: `
    @if (loading$ | async) {
      <div class="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
        <div class="loader-panel">
          <img
            ngSrc="logo.png"
            width="92"
            height="92"
            alt="5S Audit loading logo"
            class="loader-logo"
            priority
          />
          <p class="loading-text">Loading...</p>
        </div>
      </div>
    }
  `,
  styles: [
    `
    .loading-overlay {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      background-color: rgb(13 18 28 / 0.45);
      z-index: 2000;
    }

    .loader-panel {
      display: grid;
      justify-items: center;
      gap: 0.8rem;
      padding: 1.5rem 1.75rem;
      border-radius: 1rem;
      background-color: rgb(255 255 255 / 0.08);
      backdrop-filter: blur(4px);
    }

    .loader-logo {
      animation: logo-pulse 1.5s ease-in-out infinite;
      transform-origin: center;
      filter: drop-shadow(0 6px 14px rgb(0 0 0 / 0.22));
    }

    .loading-text {
      margin: 0;
      color: #f8f9fa;
      letter-spacing: 0.03em;
      font-weight: 600;
    }

    @keyframes logo-pulse {
      0% {
        transform: scale(0.9);
        opacity: 0.8;
      }

      50% {
        transform: scale(1.08);
        opacity: 1;
      }

      100% {
        transform: scale(0.9);
        opacity: 0.8;
      }
    }
  `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingIndicatorComponent {
  protected readonly loading$ = inject(LoadingService).loading$;
}
