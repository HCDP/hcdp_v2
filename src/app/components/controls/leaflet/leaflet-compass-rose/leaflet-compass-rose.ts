import { Component, effect, ElementRef, input, Input, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { Control, DomUtil, Map, ControlOptions } from "leaflet";

@Component({
  selector: 'app-leaflet-compass-rose',
  imports: [],
  templateUrl: './leaflet-compass-rose.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './leaflet-compass-rose.scss',
})
export class LeafletCompassRose {
  map = input.required<Map>();
  options = input.required<RoseControlOptions>();

  container = viewChild.required<ElementRef<HTMLDivElement>>('roseContainer');
  roseImage = viewChild.required<ElementRef<HTMLImageElement>>('roseImg');

  constructor() {
    effect((onCleanup) => {
      const mapInstance = this.map();
      const opts = this.options();
      
      const el = this.container().nativeElement;
      const imgEl = this.roseImage().nativeElement;

      // Apply styles dynamically
      if (opts.style) {
        Object.assign(el.style, opts.style);
      }
      
      // Apply the image source safely
      imgEl.src = opts.image;

      // Create the custom Leaflet Control
      const RoseControl = Control.extend({
        onAdd: () => el
      });

      // Pass Leaflet-specific options (like 'position') into the control
      const control = new RoseControl({ position: opts.position });
      control.addTo(mapInstance);

      // Cleanup if the map changes
      onCleanup(() => {
        mapInstance.removeControl(control);
      });
    });
  }
}

export interface RoseControlOptions extends ControlOptions {
  image: string,
  style?: {[style: string]: string}
}