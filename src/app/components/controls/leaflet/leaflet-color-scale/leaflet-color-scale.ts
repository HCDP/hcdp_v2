import { Component, effect, inject, input, output, ElementRef, viewChild, signal } from '@angular/core';
import { MapState } from '../../../../models/datasets/mapState';
import { ColorStore } from '../../../../services/colors/color-store';
import { Control, ControlPosition, Map } from 'leaflet';
import { ColorScale } from '../../../../models/leaflet/colors';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule}  from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MapScaleConfig } from "../../../../dialogs/map-scale-config/map-scale-config";
import { firstValueFrom } from 'rxjs';
import { ColorScaleDisplay } from '../color-scale-display/color-scale-display';

@Component({
  selector: 'app-leaflet-color-scale',
  imports: [MatButtonModule, MatIconModule, ColorScaleDisplay],
  templateUrl: './leaflet-color-scale.html',
  styleUrl: './leaflet-color-scale.scss',
})
export class LeafletColorScale {
  readonly colorStore = inject(ColorStore);
  readonly dialog = inject(MatDialog);

  map = input.required<Map>();
  mapState = input.required<MapState>();
  dynamicRange = input<[number, number] | undefined>(undefined);
  position = input<ControlPosition>("bottomright");

  colorScale = output<ColorScale>();

  legendContainer = viewChild.required<ElementRef<HTMLDivElement>>('legendContainer');
  activeScaleObj = signal<ColorScale | null>(null);

  constructor() {
    effect((onCleanup) => {
      const mapInstance = this.map();
      const position = this.position();
      const el = this.legendContainer().nativeElement;

      const LegendControl = Control.extend({
        onAdd: () => el
      });

      const control = new LegendControl({ position });
      control.addTo(mapInstance);

      onCleanup(() => {
        mapInstance.removeControl(control);
      });
    });

    effect(() => {
      let scheme = this.mapState().colorScheme;
      let dynRange = this.dynamicRange();
      let stateRange = this.mapState().range;

      if (!stateRange && !dynRange) return;

      let range: [number, number] = [
        stateRange?.[0] ?? dynRange![0],
        stateRange?.[1] ?? dynRange![1]
      ];

      // Generate Scale
      let colorScale = this.colorStore.getColorScale(
        scheme, 
        range, 
        this.mapState().reverseColorScale, 
        this.mapState().domainScale
      );
      this.setColorScale(colorScale);
      
    });
  }

  async openConfig() {
    let dialogRef = this.dialog.open(MapScaleConfig, {
      data: {
        state: this.mapState(),
        mapRange: this.dynamicRange()
      }
    });

    const result: ColorScale | undefined = await firstValueFrom(dialogRef.afterClosed());

    if(result) {
      this.setColorScale(result);
    }
  }

  setColorScale(colorScale: ColorScale) {
    this.colorScale.emit(colorScale);
    this.activeScaleObj.set(colorScale);
  }
}