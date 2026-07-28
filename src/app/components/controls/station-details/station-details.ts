import { Component, computed, inject, input } from '@angular/core';
import { StationData } from '../../../models/datasets/stations';
import { StationFormatHelper } from '../../../services/stations/station-format-helper';

@Component({
  selector: 'app-station-details',
  imports: [],
  templateUrl: './station-details.html',
  styleUrl: './station-details.scss',
})
export class StationDetails {
  private formatHelper = inject(StationFormatHelper);

  station = input.required<StationData>();

  tableRows = computed(() => {
    let station = this.station();
    let rows: { label: string, value: string | number }[] = [];
    for(let field in station) {
      let castField = field as keyof StationData;
      let value = this.formatHelper.getFormattedValue(castField, station[castField]);
      if(value !== undefined && value !== null) {
        let row = {
          label: this.formatHelper.getLabel(castField),
          value
        }
        rows.push(row);
      }
    }

    return rows;
  });
}
