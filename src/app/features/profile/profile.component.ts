import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UserProfileResponseDto } from '../../core/models/profile.model';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly profile = signal<UserProfileResponseDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly selectedLogo = signal<File | null>(null);
  protected readonly logoPreviewUrl = signal<string | null>(null);

  protected readonly isCompanyMapped = computed(() => Boolean(this.profile()?.companyId));

  protected readonly brandingForm = this.formBuilder.nonNullable.group({
    companyAddress: ['', [Validators.maxLength(500)]]
  });

  constructor() {
    this.loadProfile();
  }

  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.selectedLogo.set(null);
      this.logoPreviewUrl.set(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toastService.error('Please select a valid image file.');
      input.value = '';
      return;
    }

    this.selectedLogo.set(file);
    this.logoPreviewUrl.set(URL.createObjectURL(file));
  }

  protected saveBranding(): void {
    if (!this.isCompanyMapped()) {
      this.toastService.warning('Your account is not linked to a company.');
      return;
    }

    const address = this.brandingForm.controls.companyAddress.value.trim();
    const logo = this.selectedLogo();

    if (!address && !logo) {
      this.toastService.info('No branding changes to save.');
      return;
    }

    if (this.brandingForm.invalid) {
      this.brandingForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('CompanyAddress', address);

    if (logo) {
      formData.append('Logo', logo);
    }

    this.isSaving.set(true);

    this.profileService
      .updateCompanyBranding(formData)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          const current = this.profile();
          if (current) {
            this.profile.set({
              ...current,
              companyAddress: response.companyAddress,
              companyLogoUrl: response.logoUrl || current.companyLogoUrl
            });
          }

          this.selectedLogo.set(null);
          this.logoPreviewUrl.set(null);
          this.toastService.success('Company branding updated successfully.');
        },
        error: () => {
          this.toastService.error('Unable to update company branding.');
        }
      });
  }

  private loadProfile(): void {
    this.isLoading.set(true);

    this.profileService
      .getMe()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.profile.set(response);
          this.brandingForm.patchValue({
            companyAddress: response.companyAddress ?? ''
          });
        },
        error: () => {
          this.toastService.error('Unable to load profile details.');
        }
      });
  }
}
