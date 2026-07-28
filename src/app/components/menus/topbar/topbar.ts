import { Component, effect, inject, input, ChangeDetectionStrategy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule}  from '@angular/material/icon';
import { MatSidenav } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { GlobalSettings } from "../../../dialogs/global-settings/global-settings.js"
import { DatasetFactory } from '../../../services/datasets/dataset-factory.js';
import { HCDPDatasetVisualization } from '../../../models/datasets/dataset.js';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GlobalPreferenceManager } from '../../../services/state/global-preference-manager.js';
import { LayoutManager } from '../../../services/state/layout-manager.js';

@Component({
  selector: 'app-topbar',
  imports: [MatButtonModule, MatIconModule, MatExpansionModule, MatButtonToggleModule, FormsModule, MatTooltipModule],
  templateUrl: './topbar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './topbar.scss',
})
export class Topbar {
  private readonly dialog = inject(MatDialog);
  private readonly dsFactory = inject(DatasetFactory);
  layoutManager = inject(LayoutManager);

  sidenav = input.required<MatSidenav>();

  dataset: HCDPDatasetVisualization | undefined;

  constructor() {

    effect((onCleanup) => {
      const ds = this.dsFactory.dataset.value();
      
      let isCancelled = false;
      onCleanup(() => {
        isCancelled = true;
      });

      if(ds && ds.data) {
        ds.data.then((visualizationData) => {
          if (!isCancelled) {
            this.dataset = visualizationData;
          }
        });
      }
      else {
        this.dataset = undefined;
      }
    });
  }

  toggleSidenav(): boolean {
    this.sidenav().toggle();
    return this.sidenav().opened;
  }

  openSettings(): void {
    this.dialog.open(GlobalSettings, {});
  }
}
