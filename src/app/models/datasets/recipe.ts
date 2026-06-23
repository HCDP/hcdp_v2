import { DateTimeUnit } from "luxon";
import { ColorScheme } from "../../services/colors/color-store";

export interface HCDPDatasetDefinition {
  id: string,
  label: string,
  description: string,
  layout: HCDPLayout
};

export type HCDPVisSchema = "timeseries" | "static";

export interface HCDPLayout {
  schema: HCDPVisSchema,
  data: TimeseriesSchemaData | StaticSchemaData
};

export type DataStreamType = "stations" | "raster";

export interface DataStreamRecipe {
  id: string,
  type: DataStreamType,
  // what controls trigger this datastream
  bind: string[],
  // other static params
  staticParams: Record<string, string>
}

export interface TimeseriesData {
  // static start and end dates in iso format
  range?: [string | null, string | null],
  defaultDate?: string,
  period: {
    unit: DateTimeUnit,
    interval: number
  }
}

export type ControlType = "date" | "list" | "units";

export interface ListControlValue {
  id: string,
  label: string,
  description: string
}

export type UnitSystem = "metric" | "usc";

export interface UnitValue {
  id: string,
  name: string,
  shortName: string,
  system: UnitSystem | null
}

export interface OptionControlData {
  id: string,
  label: string,
  description: string,
  type: ControlType,
  values?: ListControlValue[] | UnitValue[]
}

export interface DataOptions {
  defaults: Record<string, string>,
  controls: OptionControlData[]
}

export interface DataRange {
  standard: [number, number],
  extreme?: [number, number],
  limits: [number | null, number | null]
}

export type UnitBase = "mm" | "c"

export interface MapLayers { 
  layers: LayerData[],
  range: DataRange,
  colors: ColorScheme[],
  defaultColor: ColorScheme
}

export interface LayerData {
  stream: string,
  label: string
}

export interface TimeseriesSchemaData {
  experimental: boolean,
  warnings: {
    experimental: boolean,
    usage: string
  },
  computeUnitConversionsFrom: UnitBase | null,
  datasetParams: Record<string, string>,
  streams: DataStreamRecipe[],
  // dataset option controls
  options: DataOptions,
  timeseries: TimeseriesData,
  mapLayers: MapLayers,
  exportData: ExportData
}


export interface ExportData {
  fileTypes: Record<string, FileTypeData>,
  files: FileGroup[]
}

export interface FileTypeData {
  label: string,
  ext: string,
  description: string
}

export interface FileGroup {
  properties: FileProperty[],
  files: FileDetails[]
}

export interface FileProperty {
  id: string,
  fieldTag: string,
  label: string,
  description: string,
  defaults: string[],
  values: FilePropertyValue[]
}

export interface FilePropertyValue {
  id: string,
  label: string,
  description: string
}

export interface FileDetails {
  id: string,
  fileTag: string,
  label: string,
  description: string,
  fileType: string,
  requires: string[],
  fileParams: Record<string, string>
}


export interface StaticSchemaData {
  
}