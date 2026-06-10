import { Component, inject, signal } from '@angular/core';
import { GlobalPreferenceManager } from '../../services/state/global-preference-manager';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import {MatButtonToggleModule} from '@angular/material/button-toggle';

@Component({
  selector: 'app-global-settings',
  imports: [
    MatButtonToggleModule,
    MatButtonModule
  ],
  templateUrl: './global-settings.html',
  styleUrl: './global-settings.scss',
})
export class GlobalSettings {
  globalPreferenceManager = inject(GlobalPreferenceManager);
  dialogRef = inject(MatDialogRef<GlobalSettings>);
  preferredUnit = signal<string>(
    this.globalPreferenceManager.preferences().preferredUnit ?? "metric"
  );

  saveSettings() {
    this.globalPreferenceManager.setParams({ preferredUnit: this.preferredUnit() });
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }
}
