import { Component, signal, model, inject, effect, viewChild, ElementRef } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, ValidationErrors, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { MapLocation } from '../../../models/datasets/locationManager';
import { Configuration } from '../../../services/configuration/configuration';
import { latLngBounds } from 'leaflet';

@Component({
  selector: 'app-map-location-selector',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  templateUrl: './map-location-selector.html',
  styleUrl: './map-location-selector.scss',
})
export class MapLocationSelector {
  private config = inject(Configuration);
  
  locationInputElement = viewChild.required<ElementRef<HTMLInputElement>>("locationInput");

  mapLocation = model.required<MapLocation | undefined>();

  isLocating = signal(false);
  locationError = signal<string | null>(null);

  locationControl = new FormControl("", [this.coordinateValidator.bind(this)]);

  constructor() {
    // Signal -> Form
    effect(() => {
      const location = this.mapLocation();
      if(!location) return;
      const strVal = `${this.formatCoordValue(location.lat)}, ${this.formatCoordValue(location.lng)}`;
      // Only update if different
      if(this.locationControl.value !== strVal) {
        // use emitEvent: false to prevent valueChange sub from firing
        this.locationControl.setValue(strVal, { emitEvent: false });
      }

    });
  }

  // Form -> Signal
  updateInputLocation() {
    let value = this.locationControl.value;
    if(this.locationControl.valid && value) {
        const [lat, lng] = value.split(',').map(n => parseFloat(n));
        const location = this.mapLocation();
        // prevent passing same location
        if(!location || location.lat !== lat || location.lng !== lng) {
          this.mapLocation.set({ lat, lng });
        }
      }
  }

  formatCoordValue(value: number) {
    return parseFloat(value.toFixed(4)).toString();
  }

  // --- Internal Validator ---

  private coordinateValidator(control: AbstractControl): ValidationErrors | null {
    if(!control.value) return null; 
    
    // Matches "lat, lng" with optional spaces and negative signs
    const regex = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/;
    if(!regex.test(control.value)) {
      return { invalidFormat: true };
    }

    const parts = control.value.split(',');
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const bounds = latLngBounds(this.config.dataBounds);
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();

    // Check against hawaii geofence
    if(
      lat < minLat || 
      lat > maxLat || 
      lng < minLng || 
      lng > maxLng
    ) {
      return { outOfBounds: true };
    }

    return null;
  }

  // --- Geolocation Methods ---

  async handleLocationRequest() {
    this.isLocating.set(true);
    this.locationError.set(null);

    try {
      const coords = await this.getUserLocation();

      const bounds = latLngBounds(this.config.dataBounds);
      const minLat = bounds.getSouth();
      const maxLat = bounds.getNorth();
      const minLng = bounds.getWest();
      const maxLng = bounds.getEast();
      
      // Geofence the user's physical location
      if(
        coords.lat < minLat || 
        coords.lat > maxLat || 
        coords.lng < minLng || 
        coords.lng > maxLng
      ) {
        this.locationError.set('Your current location is outside the supported region.');
        this.locationControl.setValue(''); 
        return;
      }
      
      // If valid, update the form control
      this.locationControl.setValue(`${this.formatCoordValue(coords.lat)}, ${this.formatCoordValue(coords.lng)}`);
      this.locationInputElement().nativeElement.blur();
    }
    catch(error: any) {
      this.locationError.set(error.message || 'Unable to retrieve location');
    }
    finally {
      this.isLocating.set(false);
    }
  }

  private async getUserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if(!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => {
          let msg = 'An unknown error occurred.';
          if(error.code === 1) msg = 'Location permission denied.';
          if(error.code === 2) msg = 'Location unavailable.';
          if(error.code === 3) msg = 'Location request timed out.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }
}
