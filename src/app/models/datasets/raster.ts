

export class RasterData {

    private data: {
      header: RasterHeader,
      data: BandData
    };

    constructor(header: RasterHeader, data: BandData) {
      this.data = {
        header: header,
        data: {}
      }
    }


    verifyIndexRange(values: IndexedValues): boolean {
      let valid = true;
      let maxValue = this.data.header.nRows * this.data.header.nCols;
      let indices = values.keys();
      let pos = indices.next();
      while(!pos.done) {
        if(pos.value >= maxValue) {
          valid = false;
          break;
        }
        pos = indices.next();
      }
      return valid;
    }

    getHeader(): RasterHeader {
      return this.data.header;
    }

    getBandNames(): string[] {
      return Object.keys(this.data.data);
    }

    getBands(bands?: string[]): BandData {
      let data: BandData = {};
      if(bands == undefined) {
          data = this.data.data;
      }
      else {
        let name: string;
        let i: number;
        for(i = 0; i < bands.length; i++) {
          name = bands[i];
          data[name] = this.data.data[name]
        }
      }
      return data;
    }

}




export type IndexedValues = Map<number, number>;

export interface BandData {
  [bandName: string]: IndexedValues
}

export interface RasterHeader {
  nCols: number,
  nRows: number,
  xllCorner: number,
  yllCorner: number,
  cellXSize: number,
  cellYSize: number
}

