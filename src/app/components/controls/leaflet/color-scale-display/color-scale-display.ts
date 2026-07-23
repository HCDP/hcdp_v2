import { Component, computed, input } from '@angular/core';
import { ColorScale } from '../../../../models/leaflet/colors';

@Component({
  selector: 'app-color-scale-display',
  imports: [],
  templateUrl: './color-scale-display.html',
  styleUrl: './color-scale-display.scss',
})
export class ColorScaleDisplay {
  colorScale = input.required<ColorScale>();

  displayData = computed(() => {
    const scale = this.colorScale();
    const [min, max] = scale.getRange();
    const diff = max - min;

    const colors = scale.getColors();
    const cssColors: string[] = colors.map((color: chroma.Color) => color.css());
    const gradient = `linear-gradient(to top, ${cssColors.join(', ')})`;

    const labels = [
      `+${max.toFixed(1)}`,
      `+${(min + diff * 0.75).toFixed(1)}`,
      `+${(min + diff * 0.5).toFixed(1)}`,
      `+${(min + diff * 0.25).toFixed(1)}`,
      `${min.toFixed(1)}`
    ];

    return { gradient, labels };
  });
}