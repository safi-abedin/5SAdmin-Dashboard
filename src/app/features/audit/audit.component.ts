import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-audit',
  imports: [ReactiveFormsModule],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditComponent {
  protected readonly checklistForm = new FormGroup({
    area: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    score: new FormControl(3, { nonNullable: true, validators: [Validators.min(1), Validators.max(5)] }),
    remarks: new FormControl('', { nonNullable: true })
  });

  protected submitted = false;

  submit(): void {
    this.submitted = true;

    if (this.checklistForm.invalid) {
      this.checklistForm.markAllAsTouched();
      return;
    }

    this.checklistForm.reset({ area: '', score: 3, remarks: '' });
    this.submitted = false;
  }
}
