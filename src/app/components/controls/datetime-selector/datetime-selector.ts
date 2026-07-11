import { Component, Injectable, input, viewChild, computed, inject, model, effect, untracked } from '@angular/core';
import { MatDatepickerModule, MatCalendarHeader, MatCalendarView, MatDatepicker } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { DateTime } from 'luxon';
import { LuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { TimeSelector } from '../time-selector/time-selector';
import { Period, UNIT_PRECEDENT } from '../../../models/datasets/time';

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
  private adapter = inject<DateAdapter<DateTime>>(DateAdapter);

  min = input<DateTime>();
  max = input<DateTime>();
  period = input.required<Period>();

  date = model.required<DateTime>(); 

  datePicker = viewChild.required<MatDatepicker<DateTime>>('datePicker');
  dateControl: FormControl<DateTime|null> = new FormControl<DateTime|null>(null);
  
  showTime = computed(() => {
    return UNIT_PRECEDENT.lookup(this.period().unit)! < UNIT_PRECEDENT.lookup("day")!;
  });
  

  constructor() {
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

    // Reactively sync the external model -> form control
    effect(() => {
      const newDate = this.date();
      
      // Untrack the control reading so we don't accidentally trigger circular updates
      untracked(() => {
        const currentControlDate = this.dateControl.value;
        if(!currentControlDate || !newDate.equals(currentControlDate)) {
          this.dateControl.setValue(newDate, { emitEvent: false });
        }
      });
    });
  }


  ngOnInit() {
    let period = this.period().unit;
    const luxonAdapter = this.adapter as DynamicLuxonAdapter;
    luxonAdapter.activeFormat = period === 'month' ? 'yyyy/MM' : 'yyyy/MM/dd';
  }

  setDate() {
    const date = this.dateControl.value;
    if(date) {
      this.date.set(date);
    }
  }

  getDefaultView(): MatCalendarView {
    let period = this.period().unit;
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
    let period = this.period().unit
    if(view == period) {
      this.dateControl.setValue(date);
      this.datePicker().close();
    }
  }

  monthSelectHandler(event: DateTime) {
    let period = this.period().unit
    if(period == "month") {
      this.dateControl.setValue(event);
      this.datePicker().close();
    }
  }

}

