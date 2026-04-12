import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild
} from '@angular/core';

@Component({
  selector: 'app-fullscreen-modal',
  templateUrl: './fullscreen-modal.component.html',
  styleUrl: './fullscreen-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()'
  }
})
export class FullscreenModalComponent {
  private readonly shellRef = viewChild<ElementRef<HTMLElement>>('modalShell');

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly close = output<void>();

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.focusFirstInteractiveElement();
    });
  }

  protected closeModal(): void {
    this.close.emit();
  }

  protected onEscape(): void {
    this.close.emit();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const shell = this.shellRef()?.nativeElement;
    if (!shell) {
      return;
    }

    const focusable = this.getFocusableElements(shell);
    if (focusable.length === 0) {
      event.preventDefault();
      shell.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement as HTMLElement | null;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusFirstInteractiveElement(): void {
    const shell = this.shellRef()?.nativeElement;
    if (!shell) {
      return;
    }

    const focusable = this.getFocusableElements(shell);
    if (focusable.length > 0) {
      focusable[0].focus();
      return;
    }

    shell.focus();
  }

  private getFocusableElements(root: HTMLElement): HTMLElement[] {
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => !element.hasAttribute('hidden') && element.offsetParent !== null
    );
  }
}
