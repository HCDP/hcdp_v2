import { signal, WritableSignal } from '@angular/core';
import { DateTime } from "luxon";
import { Period } from "./time";


// dates should already have timezone built in
export class HCDPTimeseriesData {
  private readonly _period: Period
  private readonly _start: DateTime;
  private readonly _end: DateTime;
  private readonly _dateSignal: WritableSignal<DateTime>;

  constructor(period: Period, start: DateTime, end: DateTime, defaultDate?: DateTime) {
    this._period = period;
    this._start = start;
    this._end = end;
    let initialDate = defaultDate ?? end;
    this._dateSignal = signal(initialDate);
  }

  get unit() {
    return this._period.unit
  }

  get interval() {
    return this._period.interval;
  }

  get period() {
    return this._period;
  }

  get start() {
    return this._start;
  }

  get end() {
    return this._end
  }

  get date() {
    return this._dateSignal();
  }

  get dateSignal() {
    return this._dateSignal.asReadonly();
  }

  setDate(date: DateTime) {
    date = this.checkDate(date);
    this._dateSignal.set(date); // Update signal
    return date;
  }

  next(intervals?: number) {
    let date = this.checkNext(intervals);
    this._dateSignal.set(date); // Update signal
    return date;
  }

  previous(intervals: number) {
    let date = this.checkPrevious(intervals);
    this._dateSignal.set(date); // Update signal
    return date;
  }

  checkDate(date: DateTime) {
    return this._period.round(date);
  }

  checkNext(intervals: number = 1) {
    let date = this._period.add(intervals, this.date)
    if(date > this._end) {
      date = this._end;
    }
    return date;
  }

  checkPrevious(intervals: number = 1) {
    let date = this._period.subtract(intervals, this.date);
    if(date < this._start) {
      date = this._start;
    }
    return date;
  }

  setStart() {
    this._dateSignal.set(this._start);
  }

  setEnd() {
    this._dateSignal.set(this._end);
  }


  checkJumpBackward(magnitude: number = 1) {
    let higherOrder = this.period.getHigherOrder(magnitude);
    let date = null;
    if(higherOrder) {
      date = higherOrder.subtract(1, this.date);
      // round date to valid period and round out of range
      date = this.checkDate(date);
    }
    return date;
  }

  checkJumpForward(magnitude: number = 1) {
    let higherOrder = this.period.getHigherOrder(magnitude);
    let date = null;
    if(higherOrder) {
      date = higherOrder.add(1, this.date);
      // round date to valid period and round out of range
      date = this.checkDate(date);
    }
    return date;
  }

  jumpForward(magnitude: number = 1) {
    let date = this.checkJumpForward(magnitude);
    if(date) {
      this._dateSignal.set(date);
    }
    return date;
  }

  jumpBackward(magnitude: number = 1) {
    let date = this.checkJumpBackward(magnitude);
    if(date) {
      this._dateSignal.set(date);
    }
    return date;
  }


  expandDates(start?: DateTime, end?: DateTime) {
    let dates = [];
    if(!start || start < this._start) {
      start = this._start;
    }
    if(!end || end > this._end) {
      end = this._end;
    }
    let date = start;
    while(date <= end) {
      dates.push(date);
      this._period.add(1, date);
    }
    return dates;
  }
}