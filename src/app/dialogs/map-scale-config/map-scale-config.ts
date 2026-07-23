import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { DataRangeType, MapState, ScaleConfigurationData } from '../../models/datasets/mapState';
import { ColorScheme, ColorStore } from '../../services/colors/color-store';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ColorScaleDisplay } from '../../components/controls/leaflet/color-scale-display/color-scale-display';

@Component({
  selector: 'app-map-scale-config',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    ColorScaleDisplay
  ],
  templateUrl: './map-scale-config.html',
  styleUrl: './map-scale-config.scss'
})
export class MapScaleConfig {
  private dialogRef = inject(MatDialogRef<MapScaleConfig>);
  public dialogData = inject<MapScaleConfigData>(MAT_DIALOG_DATA);
  colorStore = inject(ColorStore);

  get mapState() { return this.dialogData.state; }
  get mapRange() { return this.dialogData.mapRange; }

  availableSchemes = this.mapState.colors;

  selectedScheme = signal<ColorScheme>(this.mapState.colorScheme);
  activePreset = signal<DataRangeType>(this.mapState.dataRangeType);
  usePseudoLog = signal<boolean>(this.mapState.usePseudoLog);
  reverseColorScale = signal<boolean>(this.mapState.reverseColorScale);

  lockMin = signal<boolean>(this.mapState.config.range[0] === null);
  lockMax = signal<boolean>(this.mapState.config.range[1] === null);

  customLow = signal<number>(this.mapState.config.range[0] ?? this.mapRange[0]);
  customHigh = signal<number>(this.mapState.config.range[1] ?? this.mapRange[1]);

  colorScale = computed(() => {
    let range: [number, number];
    if(this.activePreset() === "standard") {
      range = this.mapState.standardRange;
    }
    else if(this.activePreset() === "extreme") {
      range = this.mapState.extremeRange!;
    }
    else {
      range = [this.customRangeLow, this.customRangeHigh];
    }

    let domainScale = this.usePseudoLog() ? (value: number) => this.mapState.pseudoLog(value) : undefined;
    return this.colorStore.getColorScale(this.selectedScheme(), range, this.reverseColorScale(), domainScale);
  });

  get customRangeLow() {
    return this.lockMin() ? this.mapRange[0] : this.customLow();
  }

  get customRangeHigh() {
    return this.lockMax() ? this.mapRange[1] : this.customHigh();
  }

  setPreset(preset: DataRangeType) {
    this.activePreset.set(preset);
  }

  updateCustomLow(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    if(isNaN(value)) {
      value = this.mapState.standardRange[0];
    }
    const bound = this.mapState.limits[0];
    if(bound !== null) {
      value = Math.max(value, bound);
    }
     // make sure value is below the high value
    value = Math.min(value, this.customRangeHigh);
    // update the signal state
    this.customLow.set(value);
    // update input
    input.value = value.toString();
  }

  updateCustomHigh(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    if(isNaN(value)) {
      value = this.mapState.standardRange[1];
    }
    const bound = this.mapState.limits[1];
    if(bound !== null) {
      value = Math.min(value, bound);
    }
    // make sure value is over the low value
    value = Math.max(value, this.customRangeLow);
    // update the signal state
    this.customHigh.set(value);
    // update input
    input.value = value.toString();
  }

  saveAndClose() {
    const newConfig: ScaleConfigurationData = {
      color: this.selectedScheme(),
      reverse: this.reverseColorScale(), 
      usePseudoLog: this.usePseudoLog(),
      dataRangeType: this.activePreset(),
      range: [this.lockMin() ? null : this.customLow(), this.lockMax() ? null : this.customHigh()]
    };
    this.dialogData.state.config = newConfig;

    const payload = this.colorScale();

    this.dialogRef.close(payload);
  }

  cancel() {
    this.dialogRef.close();
  }
}

interface MapScaleConfigData {
  state: MapState,
  mapRange: [number, number]
}