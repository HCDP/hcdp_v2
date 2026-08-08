import { Component, ChangeDetectionStrategy, input, effect, viewChild, ElementRef } from '@angular/core';
import { Map } from 'leaflet';

@Component({
  selector: 'app-leaflet-header',
  imports: [],
  templateUrl: './leaflet-header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './leaflet-header.scss',
})
export class LeafletHeader {
  map = input.required<Map>();
  label = input.required<string>();
  sublabel = input<string>();

  headerControl = viewChild.required<ElementRef<HTMLDivElement>>("headerControl");

  constructor() {
    effect(() => {
      let map = this.map();
      let control = this.headerControl().nativeElement;
      let mapContainer = map.getContainer();
      let controlContainer = mapContainer.getElementsByClassName("leaflet-control-container");
      controlContainer[0].appendChild(control);
    });
  }
}
