import { Component, input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

import { HCDPStationDataManager, StationData, StationFilter } from '../../../models/datasets/stations'; // Ensure path is correct

@Component({
  selector: 'app-station-filters',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './station-filters.html',
  styleUrl: './station-filters.scss',
})
export class StationFilters {
  manager = input.required<HCDPStationDataManager>();

  // --- FORM STATE ---
  selectedField = signal<keyof StationData | null>(null);
  selectedStringValues = signal<string[]>([]);
  dropdownSearch = signal<string>(''); 
  rangeMin = signal<number | null>(null);
  rangeMax = signal<number | null>(null);
  negateInput = signal<boolean>(false);

  // --- COMPUTED SIGNALS ---

  // 1. Extract all available fields dynamically from the loaded data
  availableFields = computed(() => {
    const dataMap = this.manager().stationData;
    const allKeys = new Set<string>();
    
    // Define the exact fields you want to hide from the user
    const ignoredFields = ['id_field', 'station_group']; 

    for (const st of Object.values(dataMap)) {
      Object.keys(st).forEach(k => {
        // Only add the key if it is NOT in the ignored list
        if (!ignoredFields.includes(k)) {
          allKeys.add(k);
        }
      });
    }

    return Array.from(allKeys).map(key => ({
      value: key as keyof StationData,
      label: this.manager().getLabel(key) || key 
    })).sort((a, b) => a.label.localeCompare(b.label));
  });

  // 2. Determine type and collect unique existing values for the selected field
  fieldMetadata = computed(() => {
    const field = this.selectedField();
    if (!field) return null;

    const dataMap = this.manager().stationData;
    let type: 'string' | 'number' = 'string';
    const uniqueStringValues = new Set<string>();
    
    // Track absolute min and max for numbers
    let absMin = Infinity;
    let absMax = -Infinity;

    for (const st of Object.values(dataMap)) {
      const val = st[field];
      if (val !== undefined && val !== null) {
        type = typeof val === 'number' ? 'number' : 'string';
        
        if (type === 'string') {
          uniqueStringValues.add(val as string);
        } else if (type === 'number') {
          const numVal = val as number;
          if (numVal < absMin) absMin = numVal;
          if (numVal > absMax) absMax = numVal;
        }
      }
    }

    // Fallback just in case a numeric field has no data at all
    if (absMin === Infinity) absMin = 0;
    if (absMax === -Infinity) absMax = 0;

    const availableValues = Array.from(uniqueStringValues).map(v => ({
      raw: v,
      formatted: this.manager().getFormattedValue(field, v) as string
    })).sort((a, b) => a.formatted.localeCompare(b.formatted));

    return { type, availableValues, absMin, absMax };
  });

  // 3. Filter the multi-select options based on the user's search text
  filteredDropdownValues = computed(() => {
    const meta = this.fieldMetadata();
    if (!meta || meta.type !== 'string') return [];

    const search = this.dropdownSearch().toLowerCase().trim();
    if (!search) return meta.availableValues;

    return meta.availableValues.filter(val => 
      val.formatted.toLowerCase().includes(search)
    );
  });

  // 4. Validate form state based on the current field type
  isFormValid = computed(() => {
    const meta = this.fieldMetadata();
    if (!meta) return false;

    if (meta.type === 'string') {
      return this.selectedStringValues().length > 0;
    } else {
      return this.rangeMin() !== null && 
             this.rangeMax() !== null && 
             this.rangeMin()! <= this.rangeMax()!;
    }
  });

  // --- METHODS ---

  onFieldChange() {
    this.selectedStringValues.set([]);
    this.dropdownSearch.set('');
  }

  addFilter() {
    const field = this.selectedField();
    const meta = this.fieldMetadata();
    if (!field || !meta || !this.isFormValid()) return;

    if (meta.type === 'string') {
      this.manager().addFilter(field, 'value', this.selectedStringValues(), this.negateInput());
    } else {
      this.manager().addFilter(field, 'range', [this.rangeMin()!, this.rangeMax()!], this.negateInput());
    }

    this.resetForm();
  }

  removeFilter(filter: StationFilter) {
    this.manager().removeFilter(filter);
  }

  private resetForm() {
    this.selectedField.set(null);
    this.selectedStringValues.set([]);
    this.dropdownSearch.set('');
    this.rangeMin.set(null);
    this.rangeMax.set(null);
    this.negateInput.set(false);
  }

  getFilterDisplayText(filter: StationFilter): string {
    const f = filter as any; 
    const fieldLabel = this.manager().getLabel(f.field) || f.field;
    const prefix = f.negate ? 'NOT ' : '';

    if (f.type === 'value') {
      const formattedVals = (f.values as string[]).map(v => this.manager().getFormattedValue(f.field, v));
      return `${prefix}${fieldLabel} in (${formattedVals.join(', ')})`;
    } else {
      return `${prefix}${fieldLabel} between ${f.values[0]} and ${f.values[1]}`;
    }
  }

  validateNumericRange(inputType: 'min' | 'max') {
    const meta = this.fieldMetadata();
    if (!meta || meta.type !== 'number') return;

    const currentMin = this.rangeMin();
    const currentMax = this.rangeMax();

    if (inputType === 'min' && currentMin !== null) {
      if (currentMin < meta.absMin) {
        this.rangeMin.set(meta.absMin);
      } else if (currentMax !== null && currentMin > currentMax) {
        this.rangeMin.set(currentMax); // Snap to the user's Max
      } else if (currentMin > meta.absMax) {
        this.rangeMin.set(meta.absMax); // Snap to the absolute Max
      }
    }

    if (inputType === 'max' && currentMax !== null) {
      if (currentMax > meta.absMax) {
        this.rangeMax.set(meta.absMax);
      } else if (currentMin !== null && currentMax < currentMin) {
        this.rangeMax.set(currentMin); // Snap to the user's Min
      } else if (currentMax < meta.absMin) {
        this.rangeMax.set(meta.absMin); // Snap to the absolute Min
      }
    }
  }
}