import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutShellService {
  readonly isMobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((value) => !value);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
