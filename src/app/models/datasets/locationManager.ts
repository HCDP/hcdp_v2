import { signal, WritableSignal } from "@angular/core";
import { StationData } from "./stations";


export class LocationManager {
  private _locationRef: WritableSignal<LocationData | null>;

  constructor() {
    this._locationRef = signal<LocationData | null>(null);
  }

  selectLocation(type: "map", location: MapLocation): void
  selectLocation(type: "station", location: StationData): void
  selectLocation(type: "map" | "station", location: MapLocation | StationData): void {
    this._locationRef.set({
      type,
      location
    } as LocationData);
  }

  get location() {
    return this._locationRef.asReadonly();
  }
}

export type LocationData = {
  type: "map",
  location: MapLocation
} | {
  type: "station",
  location: StationData
}

export interface MapLocation {
  lat: number,
  lng: number
};