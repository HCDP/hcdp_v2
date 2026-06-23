import { Component, resource, computed, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { TabBase } from "../tab-base/tab-base";
import { HCDPDatasetTimeseriesVisualization, HCDPVisSubtypes } from '../../../models/datasets/dataset';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StationTable } from '../../controls/station-table/station-table';
import { StationFilters } from '../../controls/station-filters/station-filters';

@Component({
  selector: 'app-locations',
  imports: [MatTableModule, MatSortModule, MatProgressSpinnerModule, StationTable, StationFilters],
  templateUrl: './locations.html',
  styleUrl: './locations.scss',
})
export class Locations extends TabBase {
  activeStationId = signal<string | undefined>(undefined);

  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });

  stationData = computed(() => {
    let streamData = this.typedDataset().dataStreams;
    let streams = streamData.getStreamsOfType("stations");
    let streamIds = Object.keys(streams);
    if(streamIds.length > 0) {
      // assume only one for now
      let stream = streams[streamIds[0]];
      return stream;
    }
    return undefined;
  });
}