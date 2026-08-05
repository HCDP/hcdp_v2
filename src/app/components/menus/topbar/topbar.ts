import { Component, effect, inject, input, ChangeDetectionStrategy, computed } from '@angular/core';
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
import { LayoutManager } from '../../../services/state/layout-manager.js';
import { DataView, UrlStateManager } from '../../../services/state/url-state-manager.js';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-topbar',
  imports: [MatButtonModule, MatIconModule, MatExpansionModule, MatButtonToggleModule, FormsModule, MatTooltipModule, NgTemplateOutlet],
  templateUrl: './topbar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './topbar.scss',
})
export class Topbar {
  private readonly dialog = inject(MatDialog);
  private readonly dsFactory = inject(DatasetFactory);
  layoutManager = inject(LayoutManager);
  urlManager = inject(UrlStateManager);

  sidenav = input.required<MatSidenav>();

  isVis = computed(() => {
    return this.urlManager.paths().view === "visualize";
  });

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

  changeView(view: DataView) {
    console.log(view);
    this.urlManager.changeView(view);
  }
}
