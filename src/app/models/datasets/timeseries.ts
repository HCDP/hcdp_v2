import { DateTime } from "luxon";
import { Period } from "./time";
import { BehaviorSubject, Observable } from "rxjs";


// dates should already have timezone built in
export class HCDPTimeseriesData {
  private readonly _period: Period
  private readonly _start: DateTime;
  private readonly _end: DateTime;
  private readonly _dateSubject: BehaviorSubject<DateTime>;

  constructor(period: Period, start: DateTime, end: DateTime, defaultDate?: DateTime) {
    this._period = period;
    this._start = start;
    this._end = end;
    let initialDate = defaultDate ?? end;
    this._dateSubject = new BehaviorSubject<DateTime>(initialDate);
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
    return this._dateSubject.value;
  }

  get dateStream(): Observable<DateTime> {
    return this._dateSubject.asObservable();
  }

  setDate(date: DateTime) {
    date = this.checkDate(date);
    this._dateSubject.next(date);
    return date;
  }

  next(intervals: number = 1) {
    let date = this.checkNext(intervals);
    this._dateSubject.next(date);
    return date;
  }

  previous(intervals: number = 1) {
    let date = this.checkPrevious(intervals);
    this._dateSubject.next(date);
    return date;
  }

  checkDate(date: DateTime) {
    date = this._period.round(date);
    if(date > this._end) {
      date = this._end;
    }
    else if(date < this._start) {
      date = this._start;
    }
    return date;
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

  setToStart() {
    this._dateSubject.next(this._start);
  }

  setToEnd() {
    this._dateSubject.next(this._end);
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
      this._dateSubject.next(date);
    }
    return date;
  }

  jumpBackward(magnitude: number = 1) {
    let date = this.checkJumpBackward(magnitude);
    if(date) {
      this._dateSubject.next(date);
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
      date = this._period.add(1, date);
    }
    return dates;
  }
}