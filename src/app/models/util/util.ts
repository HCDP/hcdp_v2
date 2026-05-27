

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