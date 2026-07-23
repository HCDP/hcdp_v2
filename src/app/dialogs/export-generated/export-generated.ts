import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-export-generated',
  imports: [MatDialogModule],
  templateUrl: './export-generated.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './export-generated.scss',
})
export class ExportGenerated {
  private dialogRef = inject(MatDialogRef<ExportGenerated>);
  public dialogText = inject<string>(MAT_DIALOG_DATA);

  close() {
    this.dialogRef.close();
  }
}
