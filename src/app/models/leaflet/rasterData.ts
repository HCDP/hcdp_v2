import { Statistics } from "../general/stats";

export class RasterData {
  private _data: Map<number, number>;
  private _header: RasterHeader;
  private _stats: Statistics;

  constructor(data: RasterValues, header: RasterHeader, stats: Statistics) {
    this._data = new Map<number, number>(data);
    this._header = header;
    this._stats = stats;
  }

  get stats() {
    return { ...this._stats };
  }

  get min() {
    return this._stats.min;
  }

  get max() {
    return this._stats.max;
  }

  get mean() {
    return this._stats.mean;
  }

  get stddev() {
    return this._stats.stddev;
  }

  get cols() {
    return this._header.nCols;
  }

  get rows() {
    return this._header.nRows;
  }

  get xllCorner() {
    return this._header.xllCorner;
  }

  get yllCorner() {
    return this._header.yllCorner;
  }

  get cellXSize() {
    return this._header.cellXSize;
  }

  get cellYSize() {
    return this._header.cellYSize;
  }

  get indices() {
    return this._data.keys();
  }

  valueAtIndex(index: number) {
    return this._data.get(index) ?? NaN;
  }

  valueAtGrid(x: number, y: number) {
    return this.valueAtIndex(this.gridIndex(x, y));
  }

  gridIndex(x: number, y: number) {
    return x + y * this._header.nCols;
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