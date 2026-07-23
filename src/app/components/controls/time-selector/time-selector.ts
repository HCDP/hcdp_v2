import { Component, model, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Period } from '../../../models/datasets/time';
import { DateTime } from 'luxon';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';

@Component({
  selector: 'app-time-selector',
  imports: [
    CommonModule,
    FormsModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatTimepickerModule,
    NgxMaskDirective
  ],
  providers: [
    provideLuxonDateAdapter(),
    // Forcing a locale that uses a 24-hour format
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    provideNgxMask()
  ],
  templateUrl: './time-selector.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './time-selector.scss',
})
export class TimeSelector {
  interval = model.required<Period>();
  datetime = model.required<DateTime>();

  isHourly = computed<boolean>(() => this.interval().unit == "hour");
  intervalStr = computed<string>(() => `${this.interval().interval}${this.interval().unit[0]}`);

  onTimeInput(event: Event): void {
    if(!this.isHourly() || (event as InputEvent).inputType?.includes("delete")) {
      return;
    }

    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;

    if(value.length === 2) {
      inputElement.value = value + ":00";
    }
  }

  onColonPress(event: KeyboardEvent): void {
    if (event.key === ':') {
      const inputElement = event.target as HTMLInputElement;
      const value = inputElement.value;

      if(value.length === 1) {
        event.preventDefault(); 
        
        // if hourly automatically complete time
        if(this.isHourly()) {
          inputElement.value = `0${value}:00`;
        }
        else {
          inputElement.value = `0${value}:`; 
        }
      }
    }
  }

  onTimeBlur(event: FocusEvent): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;
    const timeParts = value.split(":");

    let timeBasis = this.datetime().set({
      hour: Number.parseInt(timeParts[0]),
      minute: Number.parseInt(timeParts[1])
    });

    let roundedDate = this.interval().round(timeBasis);
    let formattedTime = roundedDate.toFormat('HH:mm');
    inputElement.value = formattedTime;
    this.datetime.set(roundedDate);
  }
}
