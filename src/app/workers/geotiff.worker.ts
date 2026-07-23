/// <reference lib="webworker" />

import * as Comlink from 'comlink';
import * as geotiff from "geotiff";

type Images = ImageData[];

type ImageData = {
  header: ImageHeader,
  bands: Bands
};

type ImageHeader = {
  nCols: number,
  nRows: number,
  xllCorner: number,
  yllCorner: number,
  cellXSize: number,
  cellYSize:  number,
};

type BandData = [number, number][];

type Bands = {[bandName: string]: BandData};

async function processArrayBufferGeotiffData(buffer: ArrayBuffer, customNoData?: number, bands?: number[], images?: number[]): Promise<Images | null> {
  let imageData: Images = [];

  try {
    let tiff: geotiff.GeoTIFF = await geotiff.fromArrayBuffer(buffer);
    const imageCount = await tiff.getImageCount();
    for(let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
      if(images && !images.includes(imageIndex)) {
        continue;
      }
      let image: geotiff.GeoTIFFImage = await tiff.getImage(imageIndex);
      // must provide upper left corner tiepoint as first tiepoint, other tiepoints not used
      let tiepoint = (await image.getTiePoints())[0];

      let pixelScale = image.fileDirectory.getValue("ModelPixelScale") || [];
      //get scales from file directory
      let [xScale, yScale] = pixelScale;

      // if bands specified only get specific bands from readRasters
      let readOptions = (bands && bands.length > 0) ? { samples: bands } : undefined;
      let rasters = await image.readRasters(readOptions);
      //if unspecified or empty assume all bands
      if(bands == undefined || bands.length == 0) {
        bands = Array.from(rasters.keys());
      }
      let rawNoData = image.fileDirectory.getValue("GDAL_NODATA") || "";
      let noData = Number.parseFloat(rawNoData);
    
      let header = {
        nCols: image.getWidth(),
        nRows: image.getHeight(),
        xllCorner: tiepoint.x,
        yllCorner: tiepoint.y - image.getHeight() * yScale,
        cellXSize: xScale,
        cellYSize: yScale,
      }
      let bandMap: Bands = {};
      
      //package data
      for(let band of bands) {
        let dataAcc: number = 0;
        let raster: geotiff.TypedArray = <geotiff.TypedArray>rasters[band];
        if(raster == undefined) {
          console.warn(`Could not find band: ${band}. Skipping...`);
          continue;
        }
        let values: [number, number][] = [];
        for(let valueIndex = 0; valueIndex < raster.length; valueIndex++) {
          let value = raster[valueIndex];
          //the nodata values are all kinds of messed up, these need to be fixed
          if(value != noData && value != customNoData && !isNaN(value)) {
            let valuePair: [number, number] = [valueIndex, value];
            values.push(valuePair);
            dataAcc += value;
          }
        }
        bandMap[band] = values;
      }
      imageData.push({
        header,
        bands: bandMap
      });
    }
    return imageData
  }
  catch(e) {
    console.error(`Error processing geotiff: ${e}`);
    return null
  }
};


const workerApi = {
  processArrayBufferGeotiffData
};
Comlink.expose(workerApi)

export type GeoTiffWorkerApi = typeof workerApi;