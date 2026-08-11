import { Component, ElementRef, viewChild, input, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { CommonModule } from "@angular/common"
import { DataPanel } from "../data-panel/data-panel";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HCDPDatasetVisualization } from '../../models/datasets/dataset';
import { MapComponent } from '../map-component/map-component';
import { LayoutManager } from '../../services/state/layout-manager';

@Component({
  selector: 'app-visualization-container',
  imports: [ DataPanel, CommonModule, MatProgressSpinnerModule, MapComponent ],
  templateUrl: './visualization-container.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './visualization-container.scss',
})
export class VisualizationContainer {
  layoutManager = inject(LayoutManager);

  dataset = input.required<HCDPDatasetVisualization>();

  dragbar = viewChild.required<ElementRef>('dragbar');
  dataContainerRef = viewChild.required<ElementRef>('dataContainer');
  mapContainerRef = viewChild.required<ElementRef>('mapContainer');

  constructor() {
    // when layout changes, clear leftover inline styles so the CSS variables govern the size again
    effect(() => {
      this.layoutManager.layoutStyle();
      const dataContainer = this.dataContainerRef()?.nativeElement;
      if (dataContainer) {
        dataContainer.style.width = '';
        dataContainer.style.height = '';
      }
    });
  }

  startResize(touch: boolean): boolean {
    let moveHandler = (event: MouseEvent | TouchEvent) => {
      let dragbar: HTMLElement = this.dragbar().nativeElement;
      let dataContainer: HTMLElement = this.dataContainerRef().nativeElement; 
      
      let isHorizontal = this.layoutManager.layoutStyle() === "horizontal";

      if (isHorizontal) {
        // --- HORIZONTAL MODE (Left / Right) ---
        let clientX = touch ? (<TouchEvent>event).touches[0].clientX : (<MouseEvent>event).clientX;
        
        let dragbarOffset = dragbar.clientWidth / 2;
        let left = dataContainer.getBoundingClientRect().left;
        let x = clientX - left - dragbarOffset;
        x = Math.max(0, x);
        
        dataContainer.style.width = `${x}px`;
        // clear inline height so CSS flex can take over
        dataContainer.style.height = '';
      }
      else {
        // --- VERTICAL MODE (Up / Down) ---
        let clientY = touch ? (<TouchEvent>event).touches[0].clientY : (<MouseEvent>event).clientY;
        
        let dragbarOffset = dragbar.clientHeight / 2;
        let top = dataContainer.getBoundingClientRect().top;
        let y = clientY - top - dragbarOffset;
        y = Math.max(0, y);
        
        dataContainer.style.height = `${y}px`;
        // clear inline width so CSS flex can take over
        dataContainer.style.width = '';
      }
      
      return false;
    }

    let stopResize = () => {
      if(touch) {
        document.removeEventListener("touchmove", moveHandler);
        document.removeEventListener("touchend", stopResize);
      }
      else {
        document.removeEventListener("mousemove", moveHandler);
        document.removeEventListener("mouseup", stopResize);
      }

      return false;
    }

    if(touch) {
      document.addEventListener("touchmove", moveHandler)
      document.addEventListener("touchend", stopResize);
    }
    else {
      document.addEventListener("mousemove", moveHandler)
      document.addEventListener("mouseup", stopResize);
    }

    return false;
  }
}