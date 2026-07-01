import { Component, ElementRef, viewChild, input } from '@angular/core';
import { CommonModule } from "@angular/common"
import { DataPanel } from "../data-panel/data-panel";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HCDPDatasetVisualization } from '../../models/datasets/dataset';
import { MapComponent } from '../map-component/map-component';

@Component({
  selector: 'app-visualization-container',
  imports: [ DataPanel, CommonModule, MatProgressSpinnerModule, MapComponent ],
  templateUrl: './visualization-container.html',
  styleUrl: './visualization-container.scss',
})
export class VisualizationContainer {
  dataset = input.required<HCDPDatasetVisualization>();

  dragbar = viewChild.required<ElementRef>('dragbar');
  dataContainerRef = viewChild.required<ElementRef>('dataContainer');
  mapContainerRef = viewChild.required<ElementRef>('mapContainer');

  startResize(touch: boolean): boolean {
    let moveHandler = (event: MouseEvent | TouchEvent) => {
      let clientY = touch ? (<TouchEvent>event).touches[0].clientY : (<MouseEvent>event).clientY;
      
      let dragbar: HTMLElement = this.dragbar().nativeElement;
      let dataContainer: HTMLElement = this.dataContainerRef().nativeElement;
      
      // offset to midpoint of dragbar
      let dragbarOffset = dragbar.clientHeight / 2;
      let top = dataContainer.getBoundingClientRect().top;
      let y = clientY - top - dragbarOffset;
      y = Math.max(0, y);
      
      dataContainer.style.height = `${y}px`;
      
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

    // stops default and propogation, equivalent of calling preventDefault and stopPropagation
    return false;
  }
}