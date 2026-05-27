import { Component, Input } from '@angular/core';
import { Control, DomUtil, Map, ControlOptions } from "leaflet";

@Component({
  selector: 'app-leaflet-compass-rose',
  imports: [],
  templateUrl: './leaflet-compass-rose.html',
  styleUrl: './leaflet-compass-rose.scss',
})
export class LeafletCompassRose {
  @Input() options: RoseControlOptions;

  @Input() set map(map: Map) {
    if(map) {
      let Rose = Control.extend({
        options: {} as RoseControlOptions,
        initialize: function(options: RoseControlOptions) {
         
          if(!options.style) {
            options.style = {};
          }
          this.options = options;
        },
        onAdd: function () {
          let control = DomUtil.get("rose-container");
          if(control && this.options.style) {
            Object.assign(control.style, this.options.style);
          }
          let img = DomUtil.get("rose");
          if(img) {
            img.setAttribute("src", this.options.image);
          }

          return control;
        }
      });
      new Rose(this.options).addTo(map);
    }
  }

  constructor() { }

}

export interface RoseControlOptions extends ControlOptions {
  image: string,
  style?: {[style: string]: string}
}