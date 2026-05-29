import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface PlaceSuggestion {
  name: string;
  street: string;
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-location-selector',
  imports: [ReactiveFormsModule],
  templateUrl: './location-selector.html',
  styleUrl: './location-selector.scss',
})
export class LocationSelector {
  private http = inject(HttpClient);

  searchControl = new FormControl('');
  
  // Writable signals for zoneless change detection
  suggestions = signal<PlaceSuggestion[]>([]);
  selectedPlace = signal<PlaceSuggestion | null>(null);

  // Bounding box for the main Hawaiian islands: [lonMin, latMin, lonMax, latMax]
  private readonly hawaiiBBox = '-160.2497,18.9173,-154.8083,22.2324';

  constructor() {
    this.searchControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      takeUntilDestroyed(), // Automatically cleans up when component destroys
      switchMap(query => {
        if (!query || query.trim().length < 3) return of([]);
        return this.fetchPlaces(query.trim());
      })
    ).subscribe(results => {
      this.suggestions.set(results);
    });
  }

  private fetchPlaces(query: string) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=${this.hawaiiBBox}&limit=5`;

    return this.http.get<any>(url).pipe(
      map(response => {
        if (!response?.features) return [];

        return response.features.map((feature: any) => {
          const props = feature.properties;
          const coords = feature.geometry.coordinates; 

          return {
            name: props.name || props.street || 'Unknown Location',
            street: props.street || '',
            city: props.city || props.county || '',
            postcode: props.postcode || '',
            latitude: coords[1],
            longitude: coords[0] 
          };
        });
      })
    );
  }

  selectPlace(place: PlaceSuggestion): void {
    this.selectedPlace.set(place);
    
    // Autofill the input without triggering a new search
    const displayValue = place.city ? `${place.name}, ${place.city}` : place.name;
    this.searchControl.setValue(displayValue, { emitEvent: false });
    
    // Clear the dropdown
    this.suggestions.set([]);
  }
}
