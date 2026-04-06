import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiErrorService } from '../../../core/services/api-error.service';

@Component({
  selector: 'app-error-banner',
  template: `
    @if (apiErrorService.message(); as errorMessage) {
      <div class="error-banner alert alert-danger alert-dismissible fade show m-0" role="alert">
        {{ errorMessage }}
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          (click)="apiErrorService.clearError()"
        ></button>
      </div>
    }
  `,
  styles: [
    `
    .error-banner {
      position: fixed;
      top: 1rem;
      right: 1rem;
      width: min(420px, calc(100vw - 2rem));
      z-index: 2100;
      box-shadow: 0 8px 20px rgb(33 37 41 / 0.2);
    }
  `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorBannerComponent {
  protected readonly apiErrorService = inject(ApiErrorService);
}
