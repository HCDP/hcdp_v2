import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { GlobalPreferenceManager } from '../../services/state/global-preference-manager';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';


@Component({
  selector: 'app-global-settings',
  imports: [
    MatButtonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule
  ],
  templateUrl: './global-settings.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './global-settings.scss',
})
export class GlobalSettings {
  private globalPreferenceManager = inject(GlobalPreferenceManager);
  private dialogRef = inject(MatDialogRef<GlobalSettings>);

  preferredUnit = signal<string>(this.globalPreferenceManager.preferences().preferredUnit ?? "metric");
  emailControl = new FormControl<string>(this.globalPreferenceManager.preferences().email ?? "", [Validators.email]);

  saveSettings() {
    let settings: any = {
      preferredUnit: this.preferredUnit()
    }
    const { value: email, valid } = this.emailControl;
    if(email && valid) {
      settings.email = email;
    }
    this.globalPreferenceManager.setParams(settings);
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }
}
