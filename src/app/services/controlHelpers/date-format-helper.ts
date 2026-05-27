import { Injectable } from '@angular/core';
import { DateTimeUnit } from 'luxon';
import { PERIOD_PRECEDENT } from "../../models/datasets/dataset";

// "year" | "quarter" | "month" | "week" | "day" | "hour" | "minute" | "second" | "millisecond"

@Injectable({
  providedIn: 'root',
})
export class DateFormatHelper {
  dateUnit: string;

  readonly formatting = {
    year: {
      parse: {
        dateInput: 'YYYY',
      },
      display: {
        dateInput: 'YYYY',
        monthYearLabel: 'YYYY',
        dateA11yLabel: 'YYYY',
        monthYearA11yLabel: 'YYYY',
      }
    },
    quarter: {
      parse: {
        dateInput: 'YYYY-[Q]Q',
      },
      display: {
        dateInput: 'YYYY-[Q]Q',
        monthYearLabel: 'YYYY',
        dateA11yLabel: '[Quarter] Q [of] YYYY',
        monthYearA11yLabel: 'YYYY-[Q]Q',
      }
    },
    month: {
      parse: {
        dateInput: 'MM/YYYY',
      },
      display: {
        dateInput: 'MM/YYYY',
        monthYearLabel: 'MMMM YYYY',
        dateA11yLabel: 'MMMM YYYY',
        monthYearA11yLabel: 'MMMM YYYY',
      }
    },
    week: {
      parse: {
        dateInput: 'gggg-[W]ww', 
      },
      display: {
        dateInput: 'gggg-[W]ww',
        monthYearLabel: 'gggg',
        dateA11yLabel: '[Week] ww [of] gggg',
        monthYearA11yLabel: 'gggg',
      }
    },
    day: {
      parse: {
        dateInput: 'MM/DD/YYYY'
      },
      display: {
        dateInput: 'MM/DD/YYYY',
        monthYearLabel: 'MMMM YYYY',
        dateA11yLabel: 'LL', 
        monthYearA11yLabel: 'MMMM YYYY',
      }
    },
    hour: {
      parse: {
        dateInput: 'MM/DD/YYYY hh:00 A',
      },
      display: {
        dateInput: 'MM/DD/YYYY hh:00 A',
        monthYearLabel: 'MMMM DD, YYYY',
        dateA11yLabel: 'LLL', 
        monthYearA11yLabel: 'MMMM DD, YYYY',
      }
    },
    minute: {
      parse: {
        dateInput: 'MM/DD/YYYY hh:mm A',
      },
      display: {
        dateInput: 'MM/DD/YYYY hh:mm A',
        monthYearLabel: 'MMMM DD, YYYY',
        dateA11yLabel: 'LLL',
        monthYearA11yLabel: 'MMMM DD, YYYY',
      }
    },
    second: {
      parse: {
        dateInput: 'MM/DD/YYYY hh:mm:ss A',
      },
      display: {
        dateInput: 'MM/DD/YYYY hh:mm:ss A',
        monthYearLabel: 'MMMM DD, YYYY',
        dateA11yLabel: 'LLLL', 
        monthYearA11yLabel: 'MMMM DD, YYYY',
      }
    },
    millisecond: {
      parse: {
        dateInput: 'MM/DD/YYYY hh:mm:ss.SSS A',
      },
      display: {
        dateInput: 'MM/DD/YYYY hh:mm:ss.SSS A',
        monthYearLabel: 'MMMM DD, YYYY',
        dateA11yLabel: 'MMMM DD, YYYY hh:mm:ss.SSS A',
        monthYearA11yLabel: 'MMMM DD, YYYY',
      }
    }
  };


  constructor() {
    this.dateUnit = "day";
  }

  format = {
    parse: {
      dateInput: 'MM/DD/YYYY'
    },
    display: {
      dateInput: 'MM/DD/YYYY',
      monthYearLabel: 'MMMM YYYY',
      dateA11yLabel: 'LL',
      monthYearA11yLabel: 'MMMM YYYY',
    }
  }

  monthFormat = {
    parse: {
      dateInput: 'MM/YYYY',
    },
    display: {
      dateInput: 'MM/YYYY',
      monthYearLabel: 'MMMM YYYY',
      dateA11yLabel: 'LL',
      monthYearA11yLabel: 'MMMM YYYY',
    }
  };

  dayFormat = {
    parse: {
      dateInput: 'MM/DD/YYYY'
    },
    display: {
      dateInput: 'MM/DD/YYYY',
      monthYearLabel: 'MMMM YYYY',
      dateA11yLabel: 'LL',
      monthYearA11yLabel: 'MMMM YYYY',
    }
  }

  getDateFormat() {
    return this.format;
  }

  setDateFormat(unit: string): boolean {
    let changed = false;
    if(unit != this.dateUnit) {
      this.dateUnit = unit;
      switch(unit) {
        case "day": {
          this.setAllProperties(this.dayFormat, this.format);
          break;
        }
        case "month": {
          this.setAllProperties(this.monthFormat, this.format);
          break;
        }
      }
      changed = true;
    }
    return changed;
  }

  setAllProperties(source: any, dest: any) {
    for(let key in source) {
      dest[key] = source[key];
    }
  }

  getFormat(period: DateTimeUnit) {

  }

  checkShowTime(period: DateTimeUnit): boolean {
    let showTime = false;
    let periodIndex = PERIOD_PRECEDENT.indexOf(period); 
    if(periodIndex < 4) {
      showTime = true;
    }
    return showTime;
  }
}

