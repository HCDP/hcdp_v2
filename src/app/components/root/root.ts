import { Component, inject, computed, ResourceRef, resource, viewChild, ChangeDetectionStrategy, effect, untracked } from '@angular/core';
import { VisualizationContainer } from '../visualization-container/visualization-container.js';
import { ExportContainer } from '../export-container/export-container.js';
import { Sidebar } from "../menus/sidebar/sidebar.js";
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { Topbar } from "../menus/topbar/topbar.js";
import { UrlStateManager } from '../../services/state/url-state-manager.js';
import { DatasetFactory } from '../../services/datasets/dataset-factory.js';
import { HCDPDataset } from '../../models/datasets/dataset.js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LayoutManager } from '../../services/state/layout-manager.js';

@Component({
  selector: 'app-root',
  imports: [VisualizationContainer, Sidebar, MatSidenavModule, Topbar, ExportContainer, MatProgressSpinnerModule],
  templateUrl: './root.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './root.scss',
})
export class Root {
  private urlStateManager = inject(UrlStateManager);
  private dsFactory = inject(DatasetFactory);
  private layoutManager = inject(LayoutManager);

  sidenav = viewChild.required<MatSidenav>("sidenav");
  
  datasetResource: ResourceRef<HCDPDataset | undefined> = this.dsFactory.dataset;

  visualizationResource = resource({
    params: () => this.datasetResource.value(),
    loader: async ({ params: dataset }) => {
      if(!dataset?.data) {
        return undefined;
      }
      return await dataset.data;
    }
  });
  // combine resource management
  isLoading = computed(() => this.datasetResource.isLoading() || this.visualizationResource.isLoading());
  error = computed(() => this.datasetResource.error() || this.visualizationResource.error());
  // final output vis resource (initialized dataset data)
  dataset = computed(() => this.visualizationResource.value());

  reloadResources() {
    if(this.datasetResource.error()) {
      this.datasetResource.reload();
    }
    else if(this.visualizationResource.error()) {
      this.visualizationResource.reload();
    }
  }

  
  visualizationSelected = computed(() => {
    let currentView = this.urlStateManager.paths().view;
    return currentView;
  });


  constructor() {
    effect(() => {
      let setOverMode = this.layoutManager.smallScreen() || this.layoutManager.layoutStyle() === "horizontal";
      untracked(() => {
        if(setOverMode) {
          this.sidenav().mode = "over";
          this.sidenav().close();
        }
        else {
          this.sidenav().mode = "side";
          this.sidenav().open();
        }
      });
    });
  }
}