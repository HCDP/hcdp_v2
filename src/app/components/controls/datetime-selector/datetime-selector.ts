import { Component, Input, ViewChild, Injectable, input, viewChild, computed, inject, DestroyRef } from '@angular/core';
import { MatDatepickerModule, MatCalendarHeader, MatCalendarView, MatDatepicker } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { DateTime, DateTimeUnit } from 'luxon';
import { LuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { DateFormatHelper } from '../../../services/controlHelpers/date-format-helper';
import { TimeSelector } from '../time-selector/time-selector';
import { HCDPTimeseriesData } from '../../../models/datasets/timeseries';
import { UNIT_PRECEDENT } from '../../../models/datasets/time';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class DynamicLuxonAdapter extends LuxonDateAdapter {
  activeFormat: string = 'yyyy/MM/dd';

  override format(date: DateTime, displayFormat: any): string {
    if(displayFormat === 'INPUT_FORMAT') {
      return date.toFormat(this.activeFormat);
    }
    return super.format(date, displayFormat);
  }
}

export const DYNAMIC_FORMATS = {
  parse: {
    dateInput: 'yyyy/MM/dd',
    timeInput: 'HH:mm',
  },
  display: {
    dateInput: 'INPUT_FORMAT',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'DDD',
    monthYearA11yLabel: 'MMMM yyyy',
    timeInput: 'HH:mm',
    timeOptionLabel: 'HH:mm'
  },
};

@Component({
  selector: 'app-datetime-selector',
  imports: [MatDatepickerModule, MatInputModule, ReactiveFormsModule, MatFormFieldModule, MatTimepickerModule, TimeSelector],
  templateUrl: './datetime-selector.html',
  styleUrl: './datetime-selector.scss',
  providers: [
    { provide: DateAdapter, useClass: DynamicLuxonAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: DYNAMIC_FORMATS }
  ]
})
export class DatetimeSelector {
  private destroyRef = inject(DestroyRef);

  timeseries = input.required<HCDPTimeseriesData>();
  datePicker = viewChild.required<MatDatepicker<DateTime>>('datePicker');
  dateControl: FormControl<DateTime|null> = new FormControl<DateTime|null>(null);
  showTime = computed(() => {
    let period = this.timeseries().period;
    // show time if subdaily
    return UNIT_PRECEDENT.lookup(period.unit)! < UNIT_PRECEDENT.lookup("day")!
  });
  

  constructor(private adapter: DateAdapter<DateTime>, private dateHelper: DateFormatHelper) {
    //override the confusing default method that switches to random things and make it go up one level
    MatCalendarHeader.prototype.currentPeriodClicked = function () {
      switch(this.calendar.currentView) {
        case "year": {
          this.calendar.currentView = "multi-year";
          break;
        }
        case "month": {
          this.calendar.currentView = "year";
        }
      }
    };
  }


  ngOnInit() {
    let period = this.timeseries().period.unit;
    const luxonAdapter = this.adapter as DynamicLuxonAdapter;

    luxonAdapter.activeFormat = period === 'month' ? 'yyyy/MM' : 'yyyy/MM/dd';
    this.dateControl.setValue(this.timeseries().date, { emitEvent: false });

    // 2. Subscribe to the timeseries date stream to catch external changes
    this.timeseries().dateStream.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((newDate: DateTime) => {
      const currentControlDate = this.dateControl.value;

      // Check if the incoming date is different from what the control already has.
      // Luxon's .equals() handles the math safely so we don't trigger an infinite loop.
      if (!currentControlDate || !newDate.equals(currentControlDate)) {
        this.dateControl.setValue(newDate, { emitEvent: false });
      }
    });
  }

  setDate() {
    if(this.dateControl.value) {
      this.timeseries().setDate(this.dateControl.value);
    }
  }

  getDefaultView(): MatCalendarView {
    let period = this.timeseries().period.unit;
    switch(period) {
      case "year": {
        return "multi-year";
      }
      case "month": {
        return "year";
      }
      default: {
        return "month";
      }
    }
  }

  viewManager(view: MatCalendarView, date: DateTime) {
    let period = this.timeseries().period.unit
    if(view == period) {
      this.dateControl.setValue(date);
      this.datePicker().close();
    }
  }

  monthSelectHandler(event: DateTime) {
    let period = this.timeseries().period.unit
    if(period == "month") {
      //event is a luxon object for the selected date, set form control
      this.dateControl.setValue(event);
      this.datePicker().close();
    }
  }

}

