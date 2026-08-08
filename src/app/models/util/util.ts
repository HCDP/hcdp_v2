

export class TwoWayMap<T, U> {
  private lookupMap: Map<T, U>;
  private reverseLookupMap: Map<U, T>;

  constructor(values: [T, U][]) {
    this.lookupMap = new Map(values);
    this.reverseLookupMap = new Map();
    for(let value of values) {
      this.reverseLookupMap.set(value[1], value[0]);
    }
  }

  lookup(value: T) {
    return this.lookupMap.get(value);
  }

  reverseLookup(value: U) {
    return this.reverseLookupMap.get(value);
  }

  get size() {
    return this.lookupMap.size;
  }
}

export class ThrottleHandler {
  private throttle;
  private finalizer: number | undefined;
  private timeout: number;
  private periodic: boolean;

  constructor(timeout: number, periodic: boolean = false) {
    this.throttle = false;
    this.timeout = timeout;
    this.periodic = periodic;
  }

  run(cb: () => void) {
    // finalize, at the end of update cycle do a final update after timeout
    clearTimeout(this.finalizer);
    this.finalizer = setTimeout(() => {
      cb();
    }, this.timeout);

    // throttle, update at most once per timeout
    // only run if periodic (otherwise jsut delay until updates complete with finalizer)
    if(this.periodic && !this.throttle) {
      // lock out updates
      this.throttle = true;
      // no need to finalize on the same frame as an update occurs
      clearTimeout(this.finalizer);
      // run callback
      cb();
      // allow update after timeout
      setTimeout(() => {
        this.throttle = false;
      }, this.timeout);
    }
  }
}