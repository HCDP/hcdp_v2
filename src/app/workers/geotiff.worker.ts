/// <reference lib="webworker" />

import * as geotiff from "geotiff";

type BandData = {[bandName: string]: number[][]};

addEventListener("message", async ({ data }) => {
  let { buffer, customNoData, bands, id } = data;
  let imageData: BandData[] = [];
  try {
    let tiff: geotiff.GeoTIFF = await geotiff.fromArrayBuffer(buffer);
    const imageCount = await tiff.getImageCount();
    for(let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
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
      let bandData: BandData = {};
      //package data
      for(let band of bands) {
        let raster: geotiff.TypedArray = <geotiff.TypedArray>rasters[band];
        if(raster == undefined) {
          throw new Error("Could not find band: " + band);
        }
        let values = [];
        for(let valueIndex = 0; valueIndex < raster.length; valueIndex++) {
          let value = raster[valueIndex];
          //the nodata values are all kinds of messed up, these need to be fixed
          if(value != noData && value != customNoData && !isNaN(value)) {
            let valuePair = [valueIndex, value];
            values.push(valuePair);
          }
        }
        bandData[band] = values;
      }
      imageData.push(bandData);
    }
    postMessage({
        id,
        imageData
      });
  }
  catch(e) {
    console.error(`Error processing geotiff: ${e}`);
    postMessage({
      id,
      header: null,
      bandData: null
    });
  }
});
