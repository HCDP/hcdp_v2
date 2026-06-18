import { AfterViewInit, Component, signal, ViewChild, inject, effect } from '@angular/core';
import { VisualizationContainer } from '../visualization-container/visualization-container.js';
import { ExportContainer } from '../export-container/export-container.js';
import { Sidebar } from "../menus/sidebar/sidebar.js";
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Topbar } from "../menus/topbar/topbar.js";
import { UrlStateManager } from '../../services/state/url-state-manager.js';
import { toSignal } from '@angular/core/rxjs-interop';
import { Params } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [VisualizationContainer, Sidebar, MatSidenavModule, Topbar, ExportContainer],
  templateUrl: './root.html',
  styleUrl: './root.scss',
})
export class Root implements AfterViewInit {
  private breakpointObserver = inject(BreakpointObserver);
  urlStateManager = inject(UrlStateManager);
  
  // Keep the signal for the visualization state
  visualizationSelected = signal<boolean>(true);

  @ViewChild("sidenav") sidenav!: MatSidenav;

  pathsSignal = toSignal(this.urlStateManager.paths, { initialValue: {} as Params });

  constructor() {
    effect(() => {
      

    // 2. Call the signal function pathsSignal() first, then access the property
      let currentView = this.pathsSignal()["view"];
      this.visualizationSelected.set(currentView === "visualize");

    });
  }

  ngAfterViewInit(): void {
    // Watch for screen size changes and update the sidenav
    this.breakpointObserver.observe(Breakpoints.Handset)
    .subscribe(result => {
      let isHandset = result.matches;
      if(isHandset) {
        this.sidenav.mode = "over";
        this.sidenav.close(); // close on mobile by default
      } 
      else {
        this.sidenav.mode = "side";
        this.sidenav.open(); // open and pin to side on desktop
      }
    });
  }
}