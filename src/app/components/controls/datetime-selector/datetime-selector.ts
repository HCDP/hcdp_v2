import { Component, Input, ViewChild, Injectable } from '@angular/core';
import { MatDatepickerModule, MatCalendarHeader, MatCalendarView } from '@angular/material/datepicker';
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
  @Input() period: DateTimeUnit = "day";
  @ViewChild("datePicker", {static: false}) datePicker: any;
  dateControl: FormControl<DateTime|null> = new FormControl<DateTime|null>(null);
  

  constructor(private adapter: DateAdapter<DateTime>, private dateHelper: DateFormatHelper) {
    //override the dumb default method that switches to random things and make it go up one level
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
    const luxonAdapter = this.adapter as DynamicLuxonAdapter;
    // ???
    luxonAdapter.activeFormat = this.period === 'month' ? 'yyyy/MM' : 'yyyy/MM/dd';
  }

  setDate() {


  }

  getDefaultView(): MatCalendarView {
    switch(this.period) {
      case "day": {
        return "month";
      }
      case "month": {
        return "year";
      }
      case "year": {
        return "multi-year";
      }
      default: {
        return "month";
      }
    }
  }

  viewManager(view: MatCalendarView, date: DateTime) {
    if(view == this.period) {
      console.log(this.datePicker.activeDate);
      this.dateControl.setValue(date);
      this.datePicker.close();
    }
  }

  monthSelectHandler(event: DateTime) {
    console.log(event)
    if(this.period == "month") {
      //event is a luxon object for the selected date, set form control
      this.dateControl.setValue(event);
      this.datePicker.close();
    }
  }

  checkShowTime(): boolean {
    return this.dateHelper.checkShowTime(this.period);
  }
  
}

