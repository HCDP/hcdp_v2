import { Component, Input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule}  from '@angular/material/icon';
import { MatSidenav } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { GlobalSettings } from "../../../dialogs/global-settings/global-settings.js"

@Component({
  selector: 'app-topbar',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  @Input() sidenav: MatSidenav;
  readonly dialog = inject(MatDialog);

  toggleSidenav(): boolean {
    this.sidenav.toggle();
    return this.sidenav.opened;
  }

  openSettings(): void {
    const dialogRef = this.dialog.open(GlobalSettings, {});

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
}
