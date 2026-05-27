import { DateTime, DateTimeUnit, Duration, DurationLikeObject, DurationOptions } from "luxon";
import { TwoWayMap } from "../util/util";

export type StandardDateTimeUnit = "minute" | "hour" | "day" | "month" | "year"

export const UNIT_ORDER: DateTimeUnit[] = [
  "millisecond",
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year"
];

export const STANDARD_UNIT_ORDER: DateTimeUnit[] = [
  "minute",
  "hour",
  "day",
  "month",
  "year"
];

export const UNIT_PRECEDENT: TwoWayMap<DateTimeUnit, number> = new TwoWayMap([
  ["millisecond", 0],
  ["second", 1],
  ["minute", 2],
  ["hour", 3],
  ["day", 4],
  ["week", 5],
  ["month", 6],
  ["quarter", 7],
  ["year", 8]
]);

export const STANDARD_UNIT_PRECEDENT: TwoWayMap<StandardDateTimeUnit, number> = new TwoWayMap([
  ["minute", 0],
  ["hour", 1],
  ["day", 2],
  ["month", 3],
  ["year", 4]
]);


const MAX_CALENDAR_LIMITS: Record<DateTimeUnit, number> = {
  millisecond: 1000, // Rolls over to a second
  second: 60,        // Rolls over to a minute
  minute: 60,        // Rolls over to an hour
  hour: 24,          // Rolls over to a day
  day: 28,           // Rolls over to a month. Strict cutoff for lowest month length
  week: 52,          // Rolls over to a new year
  month: 12,         // Rolls over to a new year
  quarter: 4,        // Rolls over to a new year
  year: Infinity
};

const NONSTANDARD_UNIT_APPROXIMATION: Partial<Record<DateTimeUnit, DateTimeUnit>> = {
  millisecond: "minute",
  second: "minute",
  week: "month",
  quarter: "year"
}


// note period class is immutable and can be reused
export class Period {
  private _unit: DateTimeUnit;
  private _interval: number;
  private _duration: Duration;
  private _options: PeriodOptions;
  // two styles of labels
  private _labels: {
    interval: string,
    data: string
  };

  constructor(unit: DateTimeUnit, interval: number, options: PeriodOptions = {type: "standard"}) {
    this._unit = unit;
    this._interval = interval;
    this._options = options;
    this._duration = Duration.fromObject({[unit]: interval}, options);
    // computation for epoch math is simpler and equivalent for simple units
    // if interval surpasses calendar limits then standard calendar resets will not work, use epoch offset if fixed offset is not provided
    if((interval == 1 && options.type == "standard") || MAX_CALENDAR_LIMITS[unit] < interval) {
      options.type = "epoch";
    }

    let intervalLabel = `${interval} ${unit}`;
    let dataLabel = intervalLabel;
    // if snot single add pluralization to interval label
    if(interval != 1) {
      intervalLabel += "s";
    }
    // if single set data label to "ly" form
    else {
      // daily is spelled weird, everything else should just have ly appended
      dataLabel = unit == "day" ? "daily" : `${unit}ly`;
    }
    this._labels = {
      interval: intervalLabel,
      data: dataLabel
    }
  }

  getLabel(style: "data" | "interval") {
    return this._labels[style];
  }

  // get a higher order period for time skips
  getHigherOrder(magnitude: number = 1, standardUnits: boolean = true): Period | null {
    let precedentMap = standardUnits ? STANDARD_UNIT_PRECEDENT : UNIT_PRECEDENT;
    // if more than a quarter of the calendar reset period skip up one
    if(this._interval > MAX_CALENDAR_LIMITS[this._unit] / 4) {
      magnitude += 1;
    }
    // if nonstandard unit mapping to standard unit get standard approx before looking up precedence
    let unit = standardUnits ? this._unit : NONSTANDARD_UNIT_APPROXIMATION[this._unit] ?? this._unit;
    let precedent = precedentMap.lookup(unit)!;
    precedent += magnitude;
    let skipUnit = precedentMap.reverseLookup(precedent);
    if(skipUnit) {
      return new Period(skipUnit, 1);
    }
    else {
      return null;
    }
  }

  add(intervals: number, date: DateTime) {
    // round down so shift up one interval will snap to next interval up
    let normalizedDate = this.round(date, "down");
    // if calendar resets are used anchor point shifts, need to round after each interval
    if(this._options.type == "standard" || this._options.type == "unit") {
      for (let i = 0; i < intervals; i++) {
        normalizedDate = normalizedDate.plus({ [this._unit]: this._interval });
        normalizedDate = this.round(normalizedDate);
      }
    }
    // otherwise anchor is static, can freely shift from rounded date
    else {
      normalizedDate = normalizedDate.plus({ [this._unit]: this._interval * intervals });
    }
    return normalizedDate;
  }

  subtract(intervals: number, date: DateTime) {
    // round up so shift back one interval will snap to next interval down
    let normalizedDate = this.round(date, "up");
    // if calendar resets are used anchor point shifts, need to round after each interval
    if(this._options.type == "standard" || this._options.type == "unit") {
      for (let i = 0; i < intervals; i++) {
        normalizedDate = normalizedDate.minus({ [this._unit]: this._interval });
        normalizedDate = this.round(normalizedDate);
      }
    }
    // otherwise anchor is static, can freely shift from rounded date
    else {
      normalizedDate = normalizedDate.minus({ [this._unit]: this._interval * intervals });
    }
    return normalizedDate;
  }
 

  get unit() {
    return this._unit;
  }

  get interval() {
    return this._interval;
  }

  getPeriodAs(units: DateTimeUnit[]) {
    return this._duration.shiftTo(...units);
  }

  valueOf(): number {
    return this._duration.toMillis();
  }

  isEqual(other: Period): boolean {
    return this.valueOf() == other.valueOf();
  }

  round(date: DateTime, method: "up" | "down" | "nearest" = "down"): DateTime {
    switch(this._options.type) {
      case "standard": {
        return this.roundStandardCalendarReset(date, method);
      }
      case "epoch": {
        return this.roundFixedOffsetMillis(date, method, 0);
      }
      case "fixed": {
        const anchorMillis = (this._options.reset as DateTime).toMillis();
        return this.roundFixedOffsetMillis(date, method, anchorMillis);
      }
      case "unit": {
        const anchorMillis = date.startOf(this._options.reset as DateTimeUnit).toMillis();
        return this.roundFixedOffsetMillis(date, method, anchorMillis);
      }
    }
  }


  private roundFixedOffsetMillis(date: DateTime, method: "up" | "down" | "nearest" = "down", anchorMillis: number) {
    // get epoch ms for date
    const dateMillis = date.toMillis();
    const anchorDelta = dateMillis - anchorMillis;
    const periodMillis = this._duration.toMillis();
    // get number of periods that have passed since anchor
    let ratio = anchorDelta / periodMillis;

    // round the ratio
    if(method === "down") {
      ratio = Math.floor(ratio);
    }
    else if (method === "up") {
      ratio = Math.ceil(ratio);
    }
    else {
      ratio = Math.round(ratio);
    }

    // revert from ratio to ms from achor by multiplying by period duration
    let roundedMillis = ratio * periodMillis;
    // add back the anchor
    roundedMillis += anchorMillis
    // convert to DateTime
    const roundedDate = DateTime.fromMillis(roundedMillis);
    return roundedDate;
  }


    // use standard calendar resets, e.g. 16 day interval resets at the start of each month, 7 month resets at the start of each year
  private roundStandardCalendarReset(date: DateTime, method: "up" | "down" | "nearest" = "down") {
    // strip off lower order times
    const unitStart = date.startOf(this.unit);
    const unitEnd = unitStart.plus({ [this.unit]: 1 });

    // get the number of ms past the start of the unit
    const remainderMillis = date.toMillis() - unitStart.toMillis();
    // get interval duration
    const unitDurationMillis = unitEnd.toMillis() - unitStart.toMillis();
    
    // fractional representation of how far into current interval we are
    const fraction = remainderMillis / unitDurationMillis;

    // get numeric value for the unit
    // week is polled through the weekNumber property
    const getUnit = this.unit === "week" ? "weekNumber" : this.unit;
    const numValue = date.get(getUnit as keyof DateTime<boolean>);

    // month, day, quarter, and week are 1 based values, so offset by one for computation in these cases
    const isOneBased = ["month", "day", "quarter", "week"].includes(this.unit);
    // normalize 1 based values
    const normalizedValue = isOneBased ? numValue - 1 : numValue;
    
    // get offset from start of related
    const preciseMathVal = normalizedValue + fraction;

    // round to interval
    const ratio = preciseMathVal / this.interval;
    let roundedRatio: number;
    
    if(method === "down") {
      roundedRatio = Math.floor(ratio);
    }
    else if(method === "up") {
      roundedRatio = Math.ceil(ratio);
    }
    else {
      roundedRatio = Math.round(ratio);
    }

    // convert back to scale
    const roundedInterval = roundedRatio * this.interval;
    const finalVal = isOneBased ? roundedInterval + 1 : roundedInterval;

    // get unit diff
    const diff = finalVal - numValue;
    
    return unitStart.plus({ [this.unit]: diff });
  }
}


export type PeriodResetType = "standard" | "unit" | "fixed" | "epoch";

export interface PeriodResetHandler {
  type: PeriodResetType,
  reset?: DateTime | DateTimeUnit
};

export type PeriodOptions = DurationOptions & PeriodResetHandler;