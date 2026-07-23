import { effect, inject } from "@angular/core";
import { ColorScheme } from "../../services/colors/color-store";
import { DataRange, MapLayers } from "./recipe";
import { UnitTranslations } from "../../services/unitHandlers/unit-translations";
import { UnitData } from "./dataset";

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
  private unitHandler = inject(UnitTranslations);

  private _layers: MapLayers;
  private _state: MapStateData;
  private _adjustedRanges: DataRange;

  constructor(layers: MapLayers, unitData: UnitData) {
    this._state = {
      opacity: 75,
      config: {
        color: layers.defaultColor,
        reverse: false,
        usePseudoLog: false,
        dataRangeType: "standard",
        range: layers.range.standard
      }
    };
    this._layers = layers;
    this._adjustedRanges = layers.range;

    const { units } = unitData;
    const defaultRangeUnits = layers.range.units


    effect(() => {
      let { id } = units();
      if(id === defaultRangeUnits) {
        this._adjustedRanges = layers.range;
      }
      else {
        let unitConversion = (value: number) => this.unitHandler.convert(defaultRangeUnits, id, value);
        // let { standard, extreme, custom, limits } = layers.range;
        // this._adjustedRanges = {
        //   standard: standard.map((value: number) => unitConversion(value)) as [number, number],
        //   extreme: extreme?.map((value: number) => unitConversion(value)) as undefined | [number, number],
        //   custom: custom.map((value: number | null) => value === null ? null : unitConversion(value)) as [number, number],
        //   limits: limits.map((value: number | null) => value === null ? null : unitConversion(value)) as [number, number],
        // }
      }
    });
  
    
  }

  // --- Static Data Getters ---


  get extremeRange() {
    return this._adjustedRanges.extreme;
  }

  get standardRange() {
    return this._adjustedRanges.standard;
  }

  get limits() {
    return this._adjustedRanges.limits;
  }

  get colors() {
    return this._layers.colors;
  }

  get layers() {
    return this._layers.layers;
  }

  public pseudoLog(value: number, base = Math.E) {
    const lnValue = Math.sign(value) * Math.log1p(Math.abs(value));
    return lnValue / Math.log(base);
  }

  // --- State Variable Getters/Setters ---

  get opacity() {
    return this._state.opacity;
  }

  set opacity(value: number) {
    this._state.opacity = value;
  }

  // Bulk getter/setter for the dialog payload
  get config(): ScaleConfigurationData {
    return { ...this._state.config };
  }

  set config(newConfig: ScaleConfigurationData) {
    this._state.config = { ...newConfig };
  }

  // --- Individual Config Getters/Setters ---

  get dataRangeType() {
    return this._state.config.dataRangeType;
  }

  set dataRangeType(value: DataRangeType) {
    this._state.config.dataRangeType = value;
  }

  get range() {
    switch(this._state.config.dataRangeType) {
      case "standard": 
        return this._adjustedRanges.standard;
      case "extreme": 
        return this._adjustedRanges.extreme!;
      case "custom": 
        return this._state.config.range;
    }
  }

  set range(value: [number | null, number | null]) {
    this._state.config.range = value;
  }

  get colorScheme() {
    return this._state.config.color;
  }

  set colorScheme(value: ColorScheme) {
    this._state.config.color = value;
  }

  get reverseColorScale() {
    return this._state.config.reverse;
  }

  set reverseColorScale(value: boolean) {
    this._state.config.reverse = value;
  }

  get usePseudoLog() {
    return this._state.config.usePseudoLog;
  }

  set usePseudoLog(value: boolean) {
    this._state.config.usePseudoLog = value;
  }

  // Derived read-only property. No setter needed!
  get domainScale() {
    return this._state.config.usePseudoLog
      ? (value: number) => this.pseudoLog(value)
      : (value: number) => value;
  }
}