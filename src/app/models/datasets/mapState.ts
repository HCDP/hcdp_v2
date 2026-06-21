import { ColorScheme } from "../../services/colors/color-store";
import { DataRange, LayerData, MapLayers } from "./recipe";

export type DataRangeType = "standard" | "extreme" | "custom";

export interface ScaleConfigurationData {
  color: ColorScheme;
  reverse: boolean;
  usePseudoLog: boolean;
  dataRangeType: DataRangeType;
  range: [number | null, number | null];
}

interface MapStateData {
  opacity: number;
  config: ScaleConfigurationData;
}

export class MapState {
  private _layers: LayerData[];
  private dataRanges: DataRange;
  private _colors: ColorScheme[];
  private state: MapStateData;

  constructor(layers: MapLayers) {
    this.state = {
      opacity: 75,
      config: {
        color: layers.defaultColor,
        reverse: false,
        usePseudoLog: false,
        dataRangeType: "standard",
        range: layers.range.standard
      }
    };
    this.dataRanges = layers.range;
    this._colors = layers.colors;
    this._layers = layers.layers;
  }

  // --- Static Data Getters ---

  get extremeRange() {
    return this.dataRanges.extreme;
  }

  get standardRange() {
    return this.dataRanges.standard;
  }

  get limits() {
    return this.dataRanges.limits;
  }

  get colors() {
    return this._colors;
  }

  get layers() {
    return this._layers;
  }

  public pseudoLog(value: number, base = Math.E) {
    const lnValue = Math.sign(value) * Math.log1p(Math.abs(value));
    return lnValue / Math.log(base);
  }

  // --- State Variable Getters/Setters ---

  get opacity() {
    return this.state.opacity;
  }

  set opacity(value: number) {
    this.state.opacity = value;
  }

  // Bulk getter/setter for the dialog payload
  get config(): ScaleConfigurationData {
    return { ...this.state.config };
  }

  set config(newConfig: ScaleConfigurationData) {
    this.state.config = { ...newConfig };
  }

  // --- Individual Config Getters/Setters ---

  get dataRangeType() {
    return this.state.config.dataRangeType;
  }

  set dataRangeType(value: DataRangeType) {
    this.state.config.dataRangeType = value;
  }

  get range() {
    switch(this.state.config.dataRangeType) {
      case "standard": 
        return this.dataRanges.standard;
      case "extreme": 
        return this.dataRanges.extreme!;
      case "custom": 
        return this.state.config.range;
    }
  }

  set range(value: [number | null, number | null]) {
    this.state.config.range = value;
  }

  get colorScheme() {
    return this.state.config.color;
  }

  set colorScheme(value: ColorScheme) {
    this.state.config.color = value;
  }

  get reverseColorScale() {
    return this.state.config.reverse;
  }

  set reverseColorScale(value: boolean) {
    this.state.config.reverse = value;
  }

  get usePseudoLog() {
    return this.state.config.usePseudoLog;
  }

  set usePseudoLog(value: boolean) {
    this.state.config.usePseudoLog = value;
  }

  // Derived read-only property. No setter needed!
  get domainScale() {
    return this.state.config.usePseudoLog
      ? (value: number) => this.pseudoLog(value)
      : (value: number) => value;
  }
}