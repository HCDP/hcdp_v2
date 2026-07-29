import { Component, computed, signal, effect, untracked, ChangeDetectionStrategy, linkedSignal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { TabBase } from "../tab-base/tab-base";
import { HCDPVisSubtypes } from '../../../models/datasets/dataset';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StationTable } from '../../controls/station-table/station-table';
import { StationFilters } from '../../controls/station-filters/station-filters';
import { MapLocation } from '../../../models/datasets/locationManager';
import { StationData } from '../../../models/datasets/stations';
import { StationDetails } from '../../controls/station-details/station-details';
import { MapLocationSelector } from '../../controls/map-location-selector/map-location-selector';

@Component({
  selector: 'app-locations',
  imports: [MatTableModule, MatSortModule, MatProgressSpinnerModule, StationTable, StationFilters, StationDetails, MapLocationSelector],
  templateUrl: './locations.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './locations.scss',
})
export class Locations extends TabBase {
  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });

  locationManager = computed(() => {
    return this.typedDataset().locationManager;
  });


  selectedStation = linkedSignal<StationData | undefined>(() => {
    let locationData = this.locationManager().location();
    let station: StationData | undefined;
    if(locationData && locationData.type == "station") {
      station = locationData.location;
    }
    return station;
  });
  mapLocation = linkedSignal<MapLocation | undefined>(() => {
    let locationData = this.locationManager().location();
    let location: MapLocation | undefined;
    if(locationData && locationData.type == "map") {
      location = locationData.location;
    }
    return location;
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
      let location = this.mapLocation();
      if(location) {
        this.selectMapLocation(location);
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