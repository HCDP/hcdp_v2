import { ColorScale } from "./colors";
import { RasterData } from "./rasterData";
import { Color } from "chroma-js";
import { LatLng, LatLngBounds, Coords } from "leaflet";
import * as L from "leaflet";
import { GeoJsonObject } from "geojson";

export interface RasterLayer extends L.GridLayer {
  setColorScale(colorScale: ColorScale): void;
  getCellBoundsFromGeoPos(pos: LatLng, getNoValue?: boolean): LatLngBounds | null;
  getGeoJSONCellFromGeoPos(pos: LatLng, getNoValue?: boolean): GeoJsonObject | null;
  geoPosToGridValue(lat: number, lng: number): number;
}

const RasterLayerImpl = L.GridLayer.extend({
  initialize: function(options: RasterOptions) {
    let internalOpts: RasterOptionsInternal = {
      ...options
    };
    if(options.cacheEmpty) {
      internalOpts.cache = new Set<string>();
    }
    else if(options.cacheEmpty == undefined) {
      internalOpts.cacheEmpty = false;
    }
    L.Util.setOptions(this, internalOpts);
  },

  setColorScale: function(colorScale: ColorScale) {
    this.options.colorScale = colorScale;
    this.redraw();
  },

  createTile: function(coords: Coords) {
    let coordString = JSON.stringify(coords);
    let tile: HTMLCanvasElement = <HTMLCanvasElement>L.DomUtil.create('canvas', 'leaflet-tile');

    if(!this.options.cacheEmpty || !this.options.cache.has(coordString)) {
      let ctx = tile.getContext("2d");
      if(ctx) {
        let tileSize = this.getTileSize();
        tile.width = tileSize.x;
        tile.height = tileSize.y;
        let imgData = ctx.getImageData(0, 0, tileSize.x, tileSize.y);

        // tile pixel bounds
        let xMin = coords.x * tileSize.x;
        let yMin = coords.y * tileSize.y;
        let xMax = xMin + tileSize.x;
        let yMax = yMin + tileSize.y;

        // unproject top left and bottom right corners
        let nw = this._map.unproject([xMin, yMin], coords.z);
        let se = this._map.unproject([xMax, yMax], coords.z);

        // calculate the geographic step size per pixel
        let latStep = (se.lat - nw.lat) / tileSize.y;
        let lngStep = (se.lng - nw.lng) / tileSize.x;

        let colorOff = 0;
        let hasValue = false;

        // Loop through local tile pixels (0 to 256)
        for(let y = 0; y < tileSize.y; y++) {
          
          // offset lat from origin
          let currentLat = nw.lat + (y * latStep);

          for(let x = 0; x < tileSize.x; x++) {
            
            // offset lng from origin
            let currentLng = nw.lng + (x * lngStep);

            let color = this.geoPosToColor(currentLat, currentLng);
            
            if(color !== null) {
              hasValue = true;
              const [r, g, b, a] = color.rgba();
              imgData.data[colorOff] = r;
              imgData.data[colorOff + 1] = g;
              imgData.data[colorOff + 2] = b;
              imgData.data[colorOff + 3] = a * 255;
            }
            colorOff += 4;
          }
        }

        if(this.options.cacheEmpty && !hasValue) {
          this.options.cache.add(coordString);
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
    return tile;
  },

  flattenGridCoords: function(coords: [number, number]): number {
    let [ x, y ] = coords;
    return this.options.data.cols * y + x;
  },

  decoupleGridIndex: function(index: number): [number, number] {
    return [index % this.options.data.cols, Math.floor(index / this.options.data.cols)]
  },

  offsetPosByLL: function(lat: number, lng: number): [number, number] {
    return [lat - this.options.data.yllCorner, lng - this.options.data.xllCorner];
  },

  //need to ensure in grid range,
  geoPosToGridCoords: function(lat: number, lng: number): [number, number] | null {
    let [latOffset, lngOffset] = this.offsetPosByLL(lat, lng);
    let coords: [number, number] | null = null;
    let x = Math.floor(lngOffset / this.options.data.cellXSize);
    //check if in grid range, if not return null (otherwise will provide erroneous results when flattened)
    if(x >= 0 && x < this.options.data.cols) {
      let y = Math.floor(this.options.data.rows - latOffset / this.options.data.cellYSize);
      //check range
      if(y >= 0 && y < this.options.data.rows) {
        coords = [x, y];
      }
    }
    return coords;
  },

  geoPosToGridIndex: function(lat: number, lng: number): number | null {
    let index = null;
    let coords = this.geoPosToGridCoords(lat, lng);
    if(coords != null) {
      index = this.flattenGridCoords(coords);
    }
    return index;
  },

  geoPosToGridValue: function(lat: number, lng: number): number {
    let index = this.geoPosToGridIndex(lat, lng)
    let value = NaN;
    if(index !== null) {
      value = this.options.data.valueAtIndex(index);
    }
    return value;
  },

  geoPosToColor: function(lat: number, lng: number): Color | null {
    let color: Color | null = null;
    let value = this.geoPosToGridValue(lat, lng)
    if(!isNaN(value)) {
      color = this.options.colorScale.getColor(value);
    }
    return color;
  },

  //if !getNoValue just return null if the cell is background
  getCellBoundsFromGeoPos: function(pos: LatLng, getNoValue: boolean = false): LatLngBounds | null {
    let bounds: LatLngBounds | null = null;
    let { lat, lng } = pos;
    //just start from here instead of using geoPosToGridValue to prevent need to recompute location
    let coords = this.geoPosToGridCoords(lat, lng);
    //check if bounds in grid
    if(coords != null) {
      //check if value at location if !getNoValue
      let valid = true;
      if(!getNoValue) {
        let index = this.flattenGridCoords(coords);
        if(isNaN(this.options.data.valueAtIndex(index))) {
          valid = false;
        }
      }
      if(valid) {
        let [ x, y ] = coords;
        let lx = this.options.data.xllCorner + this.options.data.cellXSize * x;
        let uy = this.options.data.yllCorner + this.options.data.cellYSize * (this.options.data.rows - y);
        //counterclockwise
        let ll = new LatLng(uy - this.options.data.cellYSize, lx);
        let ur = new LatLng(uy, lx + this.options.data.cellXSize);
        bounds = new LatLngBounds(ll, ur);
      }
    }
    return bounds;
  },

  //if no value at cell or out of bounds returns null
  //geojson uses long, lat
  //geojson counterclockwise
  getGeoJSONCellFromGeoPos: function(pos: LatLng, getNoValue: boolean = false): GeoJsonObject | null {
    let geojson = null;
    let bounds = this.getCellBoundsFromGeoPos(pos, getNoValue);

    if(bounds != null) {
      geojson = this.getGeoJSONCellFromBounds(bounds);
    }
    return geojson;
  },

  getGeoJSONCellFromBounds: function(bounds: LatLngBounds) {
    let n = bounds.getNorth();
    let e = bounds.getEast();
    let s = bounds.getSouth();
    let w = bounds.getWest();
    let geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s]
        ]]
      }
    };
    return geojson;
  }
});

export function rasterLayer(options: RasterOptions): RasterLayer {
  return new (RasterLayerImpl as any)(options);
}

export interface RasterOptions {
  cacheEmpty?: boolean,
  colorScale: ColorScale,
  data: RasterData
  zIndex?: number
}

interface RasterOptionsInternal extends RasterOptions {
  cache?: Set<string>
}
