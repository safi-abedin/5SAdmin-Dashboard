import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoadingIndicatorComponent } from './shared/components/loading-indicator/loading-indicator.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingIndicatorComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
}
