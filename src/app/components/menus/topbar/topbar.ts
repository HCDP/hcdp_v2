import { Component, Input, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule}  from '@angular/material/icon';
import { MatSidenav } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { GlobalSettings } from "../../../dialogs/global-settings/global-settings.js"
import { DatasetFactory } from '../../../services/datasets/dataset-factory.js';
import { HCDPDataset } from '../../../models/datasets/dataset.js';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-topbar',
  imports: [MatButtonModule, MatIconModule, MatExpansionModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  @Input() sidenav: MatSidenav;
  readonly dialog = inject(MatDialog);
  readonly dsFactory = inject(DatasetFactory);

  dataset: HCDPDataset | undefined;

  constructor() {
    effect(() => {
      this.dataset = this.dsFactory.dataset.value();
    });
  }

  toggleSidenav(): boolean {
    this.sidenav.toggle();
    return this.sidenav.opened;
  }

  openSettings(): void {
    this.dialog.open(GlobalSettings, {});
  }
}
