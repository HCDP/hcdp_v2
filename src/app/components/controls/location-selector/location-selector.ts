import { Component, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, ValidationErrors, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { MapLocation } from '../../../models/datasets/locationManager';

@Component({
  selector: 'app-location-selector',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  templateUrl: './location-selector.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './location-selector.scss',
})
export class LocationSelector {

  // SHOULD MOVE THIS TO CONFIGURATION OR SOMETHING FOR REUSE
  private readonly BOUNDS = {
    minLat: 18.849,
    maxLat: 22.269,
    minLng: -159.816,
    maxLng: -154.668
  };

  // --- Geolocation State ---
  selectedLocation = output<MapLocation>();


  isLocating = signal(false);
  locationError = signal<string | null>(null);

  // The new form control bound to the internal validator
  locationControl = new FormControl('', [this.coordinateValidator.bind(this)]);

  constructor() {
    // Listen to input, update the output signal if valid
    this.locationControl.valueChanges.subscribe(val => {
      if(this.locationControl.valid && val) {
        const parts = val.split(',');
        this.selectedLocation.emit({ lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) });
      }
    });
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

    // Check against your specific geofence bounds
    if(
      lat < this.BOUNDS.minLat || 
      lat > this.BOUNDS.maxLat || 
      lng < this.BOUNDS.minLng || 
      lng > this.BOUNDS.maxLng
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
      
      // Geofence the user's physical location
      if(
        coords.lat < this.BOUNDS.minLat || 
        coords.lat > this.BOUNDS.maxLat || 
        coords.lng < this.BOUNDS.minLng || 
        coords.lng > this.BOUNDS.maxLng
      ) {
        this.locationError.set('Your current location is outside the supported region.');
        this.locationControl.setValue(''); 
        return;
      }
      
      // If valid, update the form control
      this.locationControl.setValue(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      
    }
    catch (error: any) {
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
