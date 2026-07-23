import { Component, resource, computed, signal, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { TabBase } from "../tab-base/tab-base";
import { HCDPDatasetTimeseriesVisualization, HCDPVisSubtypes } from '../../../models/datasets/dataset';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StationTable } from '../../controls/station-table/station-table';
import { StationFilters } from '../../controls/station-filters/station-filters';
import { LocationSelector } from '../../controls/location-selector/location-selector';
import { MapLocation } from '../../../models/datasets/locationManager';
import { StationData } from '../../../models/datasets/stations';

@Component({
  selector: 'app-locations',
  imports: [MatTableModule, MatSortModule, MatProgressSpinnerModule, StationTable, StationFilters, LocationSelector],
  templateUrl: './locations.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './locations.scss',
})
export class Locations extends TabBase {
  selectedStation = signal<StationData | undefined>(undefined);

  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });

  locationManager = computed(() => {
    return this.typedDataset().locationManager;
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


  constructor() {
    super();
    effect(() => {
      let station = this.selectedStation();
      if(station) {
        this.selectStation(station);
      }
    });

    effect(() => {
      let locationData = this.locationManager().location();
      if(locationData && locationData.type == "station") {
        untracked(() => {
          this.selectedStation.set(locationData.location);
        });
      }
    });
  }

  selectMapLocation(location: MapLocation) {
    this.locationManager().selectLocation("map", location);
  }

  selectStation(station: StationData) {
    this.locationManager().selectLocation("station", station);
  }
}