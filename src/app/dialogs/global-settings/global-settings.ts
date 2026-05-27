import { Component } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import {MatButtonToggleModule} from '@angular/material/button-toggle';

@Component({
  selector: 'app-global-settings',
  imports: [
    // MatFormFieldModule,
    // MatInputModule,
    // FormsModule,
    // MatButtonModule,
    // MatDialogTitle,
    // MatDialogContent,
    // MatDialogActions,
    // MatDialogClose,
    MatButtonToggleModule
  ],
  templateUrl: './global-settings.html',
  styleUrl: './global-settings.scss',
})
export class GlobalSettings {

}
