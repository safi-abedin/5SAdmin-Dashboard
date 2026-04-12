import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { UserProfileResponseDto } from '../../core/models/profile.model';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { ImageViewerComponent } from '../../shared/components/image-viewer/image-viewer.component';

@Component({
  selector: 'app-my-profile',
  imports: [ImageViewerComponent],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyProfileComponent {
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);

  protected readonly profile = signal<UserProfileResponseDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly selectedImage = signal<string | null>(null);

  constructor() {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.isLoading.set(true);

    this.profileService
      .getMe()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.profile.set(response);
        },
        error: () => {
          this.toastService.error('Unable to load profile details.');
        }
      });
  }

  protected openImageViewer(imageUrl: string): void {
    this.selectedImage.set(imageUrl);
  }

  protected closeImageViewer(): void {
    this.selectedImage.set(null);
  }
}
