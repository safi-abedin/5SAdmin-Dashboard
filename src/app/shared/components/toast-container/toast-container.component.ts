import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [AsyncPipe],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent {
  protected readonly toasts$ = inject(ToastService).toasts$;
  protected readonly toastService = inject(ToastService);
}
