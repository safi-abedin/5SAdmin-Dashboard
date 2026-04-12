import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onClose()'
  }
})
export class ImageViewerComponent {
  readonly src = input.required<string>();
  readonly alt = input('Preview image');
  readonly close = output<void>();

  protected onClose(): void {
    this.close.emit();
  }
}
