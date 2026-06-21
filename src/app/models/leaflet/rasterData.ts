
export class RasterData {
  private data: Map<number, number>;
  private header: RasterHeader;
  private stats: RasterStats;

  constructor(data: RasterValues, header: RasterHeader, stats: RasterStats) {
    this.data = new Map<number, number>(data);
    this.header = header;
    this.stats = stats;
  }

  get min() {
    return this.stats.min;
  }

  get max() {
    return this.stats.max;
  }

  get mean() {
    return this.stats.mean;
  }

  get stddev() {
    return this.stats.stddev;
  }

  get cols() {
    return this.header.nCols;
  }

  get rows() {
    return this.header.nRows;
  }

  get xllCorner() {
    return this.header.xllCorner;
  }

  get yllCorner() {
    return this.header.yllCorner;
  }

  get cellXSize() {
    return this.header.cellXSize;
  }

  get cellYSize() {
    return this.header.cellYSize;
  }

  get indices() {
    return this.data.keys();
  }

  valueAtIndex(index: number) {
    return this.data.get(index) ?? NaN;
  }

  valueAtGrid(x: number, y: number) {
    return this.valueAtIndex(this.gridIndex(x, y));
  }

  gridIndex(x: number, y: number) {
    return x + y * this.header.nCols;
  }
}


export type RasterValues = [number, number][];

export type RasterHeader = {
  nCols: number,
  nRows: number,
  xllCorner: number,
  yllCorner: number,
  cellXSize: number,
  cellYSize:  number,
};

export type RasterStats = {
  min: number,
  max: number,
  mean: number,
  stddev: number
};