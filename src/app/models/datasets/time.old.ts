// import { DateTime, DateTimeUnit, Duration, DurationLikeObject, DurationOptions } from "luxon";
// import { TwoWayMap } from "../util/util";

// // export const UNIT_ORDER: DateTimeUnit[] = [
// //   "millisecond",
// //   "second",
// //   "minute",
// //   "hour",
// //   "day",
// //   "week",
// //   "month",
// //   "quarter",
// //   "year"
// // ];

// export const UNIT_PRECEDENT: TwoWayMap<DateTimeUnit, number> = new TwoWayMap([
//   ["millisecond", 0],
//   ["second", 1],
//   ["minute", 2],
//   ["hour", 3],
//   ["day", 4],
//   ["week", 5],
//   ["month", 6],
//   ["quarter", 7],
//   ["year", 8]
// ]);

// export const STANDARD_UNIT_PRECEDENT: TwoWayMap<DateTimeUnit, number> = new TwoWayMap([
//   ["second", 1],
//   ["minute", 2],
//   ["hour", 3],
//   ["day", 4],
//   ["month", 6],
//   ["year", 8]
// ]);

// export const MAX_CALENDAR_LIMITS: Record<DateTimeUnit, number> = {
//   millisecond: 1000, // Rolls over to a second
//   second: 60,        // Rolls over to a minute
//   minute: 60,        // Rolls over to an hour
//   hour: 24,          // Rolls over to a day
//   day: 28,           // Rolls over to a month. Strict cutoff for lowest month length
//   week: 52,          // Rolls over to a new year
//   month: 12,         // Rolls over to a new year
//   quarter: 4,        // Rolls over to a new year
//   year: Infinity     // Years never reset, so calendar math always works
// };

// export const STRICT_CONVERSION_BOUNDS: Partial<Record<DateTimeUnit, [number, DateTimeUnit]>> = {
//   millisecond: [1000, "second"],
//   second: [60, "minute"],
//   minute: [60, "hour"],
//   hour: [24, "day"],
//   month: [12, "year"],
//   quarter: [4, "year"]
// };

// export class Period {
//   // private _unit: DateTimeUnit;
//   // private _interval: number;
//   private _duration: Duration;
//   private _options?: PeriodOptions;
//   private _period: Partial<Record<DateTimeUnit, number>>;
//   private _unitRange: [DateTimeUnit, DateTimeUnit];
//   private _mixedUnits: boolean;
//   private _simpleUnits: boolean;

//   constructor(period: DurationLikeObject, options: PeriodOptions = {type: "standard"}) {
//     Object.keys(period).length
//     this._period = period;
//     this._duration = Duration.fromObject(period, options);
//     let unitRange: [DateTimeUnit, DateTimeUnit] = ["year", "millisecond"];

//     let streamlinedPeriod: Partial<Record<DateTimeUnit, number>> = {};
//     // first pass, reduce keys to DateTimeUnits
//     for(let unit in period) {
//       let interval = period[unit as keyof DurationLikeObject];
//       if(interval !== undefined) {
//         let streamlinedUnit: DateTimeUnit;
//         if(unit.endsWith("s")) {
//           // simplify by converting everything to unpluralized form
//           // both forms should not be provided and one will be overwritten if they are
//           streamlinedUnit = unit.slice(0, -1) as DateTimeUnit
//         }
//         else {
//           streamlinedUnit = unit as DateTimeUnit;
//         }
//         if(interval < 0) {
//           throw new Error("Invalid period provided, unit values must be greater than 0");
//         }
//         // ignore if 0
//         else if(interval > 0) {
//           streamlinedPeriod[streamlinedUnit] = interval;
//         }
//       }
//     }
//     let coalescedPeriod: Partial<Record<DateTimeUnit, number>> = {};
//     // second pass coalesce and 
    
//     // let numUnits = 0;
//     // let singleUnit: DateTimeUnit = "millisecond";
//     // let interval: number = 0;
//     for(let unit in period) {
//       let interval = period[unit as keyof DurationLikeObject];
//       if(interval !== undefined) {
//         let streamlinedUnit: DateTimeUnit;
//         // DurationLikeObject allows pluralized units, remove trailing s if this is the case
//         if(unit.endsWith("s")) {
//           // simplify by converting everything to unpluralized form, both formas should not be provided, but will be added together if they are, also handles coallescent cases
//           delete period[unit as keyof DurationLikeObject];
//           streamlinedUnit = unit.slice(0, -1) as DateTimeUnit
//           let newInterval = (period[streamlinedUnit] ?? 0) + interval
//           period[streamlinedUnit] = newInterval;
//           interval = newInterval;
//         }
//         else {
//           streamlinedUnit = unit as DateTimeUnit;
//         }
//         // validate type is indeed a DateTimeUnit
//         if(!UNIT_PRECEDENT.lookup(streamlinedUnit)) {
//           throw new Error("Invalid unit type provided");
//         }

//         if(interval < 0) {
//           throw new Error("Invalid period provided, unit values must be greater than 0");
//         }
//         // if interval is 0 just delete it
//         else if(interval == 0) {
//           delete period[streamlinedUnit];
//         }
//         else {
//           const bound = STRICT_CONVERSION_BOUNDS[unit as keyof typeof STRICT_CONVERSION_BOUNDS];
//           if(bound) {
//             let unitBoundRemainder = interval % bound[0];
//             if(unitBoundRemainder === 0) {
//               let conversionRatio = Math.trunc(interval / bound[0]);
//               period[bound[1]] = (period[bound[1]] ?? 0) + conversionRatio;
//               delete period[streamlinedUnit]
//             }
//           }
          
//         }


        

//         let unitPrecedent = UNIT_PRECEDENT.lookup(streamlinedUnit);
//         let lowPrecedent = UNIT_PRECEDENT.lookup(unitRange[0])!;
//         let highPrecedent = UNIT_PRECEDENT.lookup(unitRange[1])!;
//         if(unitPrecedent && unitPrecedent < lowPrecedent) {
//           // set low precedent
//           unitRange[0] = unit as DateTimeUnit;
//         }
//         if(unitPrecedent && unitPrecedent > highPrecedent) {
//           unitRange[1] = unit as DateTimeUnit;
//         }
//       }
//       // not defined, just delete
//       else {
//         delete period[streamlinedUnit];
//       }
//     }


//     if(numUnits == 0)  {
//       throw new Error("Invalid period provided, must contain at least one unit");
//     }
//     if(numUnits < 2) {
//       this._mixedUnits = false;
//       this._simpleUnits = interval == 1;
//     }
//     else {
//       this._mixedUnits = true;
//       this._simpleUnits = false;
//     }

    
//     let updatedOptions: PeriodOptions = {...options};

//     // validate period reset handler
//     // standard calendar resets are only valid for non mixed units that do not surpass period limits, convert standard to use epoch offset in these cases
//     // standard is equivalent to epoch rounding for simple units and is a much more streamlined computation so convert in this case as well
//     if((this._simpleUnits && updatedOptions.type == "standard") || this._mixedUnits || interval >= MAX_CALENDAR_LIMITS[singleUnit]) {
//       updatedOptions.type = "epoch";
//     }
//   }



//   get isSimple() {
//     return this._simpleUnits;
//   }

//   get isMixed() {
//     return this._mixedUnits;
//   }

//   get lowestOrderUnit() {
//     return this._unitRange[0];
//   }

//   get lowestOrderPrecedent() {
//     return UNIT_PRECEDENT.lookup(this._unitRange[0])!;
//   }

//   get highestOrderUnit() {
//     return this._unitRange[1];
//   }

//   get highestOrderPrecedent() {
//     return UNIT_PRECEDENT.lookup(this._unitRange[1])!;
//   }

//   get period() {
//     return this._period;
//   }

//   shiftPeriod(units: DateTimeUnit[]) {
//     return this._duration.shiftTo(...units);
//   }

//   shiftLow() {
//     return this._duration.shiftTo(this.lowestOrderUnit);
//   }

//   shiftHigh() {
//     return this._duration.shiftTo(this.highestOrderUnit);
//   }

//   valueOf(): number {
//     return this._duration.toMillis();
//   }

//   isEqual(other: Period): boolean {
//     return this.valueOf() == other.valueOf();
//   }

//   round(date: DateTime, method: "up" | "down" | "nearest" = "down"): DateTime {
    
//   }


//   private roundFixedOffsetMillis(date: DateTime, method: "up" | "down" | "nearest" = "down", anchorMillis: number) {
//     // get epoch ms for date
//     const dateMillis = date.toMillis();
//     const anchorDelta = dateMillis - anchorMillis;
//     const periodMillis = this._duration.toMillis();
//     // get number of periods that have passed since anchor
//     let ratio = anchorDelta / periodMillis;

//     // round the ratio
//     if(method === "down") {
//       ratio = Math.floor(ratio);
//     }
//     else if (method === "up") {
//       ratio = Math.ceil(ratio);
//     }
//     else {
//       ratio = Math.round(ratio);
//     }

//     // revert from ratio to ms from achor by multiplying by period duration
//     let roundedMillis = ratio * periodMillis;
//     // add back the anchor
//     roundedMillis += anchorMillis
//     // convert to DateTime
//     const roundedDate = DateTime.fromMillis(roundedMillis);
//     return roundedDate;
//   }

//   private roundFixedOffset(date: DateTime, method: "up" | "down" | "nearest" = "down") {
//     // fixed offset reset param should be a DateTime
//     const anchorMillis = (this._options.reset as DateTime).toMillis();
//     return this.roundFixedOffsetMillis(date, method, anchorMillis);
//   }

//   private roundFixedUnitCalendarReset(date: DateTime, method: "up" | "down" | "nearest" = "down") {
//     const anchorMillis = date.startOf(this._periodReset.reset as DateTimeUnit).toMillis();
//     return this.roundFixedOffsetMillis(date, method, anchorMillis);
//   }

//   // round to offset anchored at start of epoch
//   private roundEpoch(date: DateTime, method: "up" | "down" | "nearest" = "down") {
//     return this.roundFixedOffsetMillis(date, method, 0);
//   }

//   // use standard calendar resets, e.g. 16 day interval resets at the start of each month, 7 month resets at the start of each year
//   private roundStandardCalendarReset(date: DateTime, method: "up" | "down" | "nearest" = "down") {
//     // strip off lower order times
//     const unitStart = date.startOf(this.unit);
//     const unitEnd = unitStart.plus({ [this.unit]: 1 });

//     // get the number of ms past the start of the unit
//     const remainderMillis = date.toMillis() - unitStart.toMillis();
//     // get interval duration
//     const unitDurationMillis = unitEnd.toMillis() - unitStart.toMillis();
    
//     // fractional representation of how far into current interval we are
//     const fraction = remainderMillis / unitDurationMillis;

//     // get numeric value for the unit
//     // week is polled through the weekNumber property
//     const getUnit = this.unit === "week" ? "weekNumber" : this.unit;
//     const numValue = date.get(getUnit as keyof DateTime<boolean>);

//     // month, day, quarter, and week are 1 based values, so offset by one for computation in these cases
//     const isOneBased = ["month", "day", "quarter", "week"].includes(this.unit);
//     // normalize 1 based values
//     const normalizedValue = isOneBased ? numValue - 1 : numValue;
    
//     // get offset from start of related
//     const preciseMathVal = normalizedValue + fraction;

//     // 5. Apply rounding logic against your interval
//     const ratio = preciseMathVal / this.interval;
//     let roundedRatio: number;
    
//     if (method === "down") {
//       roundedRatio = Math.floor(ratio);
//     } else if (method === "up") {
//       roundedRatio = Math.ceil(ratio);
//     } else {
//       roundedRatio = Math.round(ratio);
//     }

//     // 6. Convert back to original scale
//     const roundedMathVal = roundedRatio * this.interval;
//     const finalVal = isOneBased ? roundedMathVal + 1 : roundedMathVal;

//     // 7. Safely apply the difference to handle rollovers 
//     // (e.g., rounding 45 mins up by 30 results in a 15-minute diff, rolling over into the next hour)
//     const diff = finalVal - numValue;
    
//     return exactStart.plus({ [this.unit]: diff });
//   }
// }


// export type PeriodResetType = "standard" | "unit" | "fixed" | "epoch";

// export interface PeriodResetHandler {
//   type: PeriodResetType,
//   reset?: DateTime | DateTimeUnit
// };

// export type PeriodOptions = DurationOptions & PeriodResetHandler;