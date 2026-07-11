import { AfterViewInit, Component, ViewChild, inject, computed, ResourceRef, resource, viewChild } from '@angular/core';
import { VisualizationContainer } from '../visualization-container/visualization-container.js';
import { ExportContainer } from '../export-container/export-container.js';
import { Sidebar } from "../menus/sidebar/sidebar.js";
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Topbar } from "../menus/topbar/topbar.js";
import { UrlStateManager } from '../../services/state/url-state-manager.js';
import { toSignal } from '@angular/core/rxjs-interop';
import { Params } from '@angular/router';
import { DatasetFactory } from '../../services/datasets/dataset-factory.js';
import { HCDPDataset } from '../../models/datasets/dataset.js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  imports: [VisualizationContainer, Sidebar, MatSidenavModule, Topbar, ExportContainer, MatProgressSpinnerModule],
  templateUrl: './root.html',
  styleUrl: './root.scss',
})
export class Root implements AfterViewInit {
  private breakpointObserver = inject(BreakpointObserver);
  private urlStateManager = inject(UrlStateManager);
  private dsFactory = inject(DatasetFactory);

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
    let currentView = this.urlStateManager.paths()["view"];
    return currentView;
  });


  



  constructor() {

  }

  ngAfterViewInit(): void {
    // Watch for screen size changes and update the sidenav
    this.breakpointObserver.observe(Breakpoints.Handset)
    .subscribe(result => {
      let isHandset = result.matches;
      if(isHandset) {
        this.sidenav().mode = "over";
        this.sidenav().close(); // close on mobile by default
      } 
      else {
        this.sidenav().mode = "side";
        this.sidenav().open(); // open and pin to side on desktop
      }
    });
  }
}