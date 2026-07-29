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
      let value = this.formatHelper.getFormattedValue(castField, station[castField]) ?? undefined;
      let label = this.formatHelper.getLabel(castField) ?? undefined;
      // ignore values that have no value and fields with no label definition
      if(value !== undefined && label !== undefined) {
        let row = {
          label,
          value
        }
        rows.push(row);
      }
    }

    return rows;
  });
}
