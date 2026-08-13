
import { DataGroup, UnitBase, UnitSystem, UnitValue } from "./recipe";
import { DataStreamManager } from "./dataStreams";
import { DataStateController } from "./stateController";
import { Signal, WritableSignal } from "@angular/core";

export class DataGroupManager {
  private _dataGroup: WritableSignal<DataGroupHandler>;

  constructor(groups: DataGroup[], streamManager: DataStreamManager, stateController: DataStateController) {
    for(let group of groups) {
      const { id, label, description, streams, units } = group;

      const { source, standard, extreme, limits, convertFrom } = units;


    }
  }

  get dataGroupSignal() {
    return this._dataGroup;
  }
}

export class DataGroupHandler {
  private _id: string;
  private _label: string;
  private _description: string;
  private _unitHandler: UnitHandler;

  constructor() {

  }
}

export class UnitHandler {
  private _units: Signal<UnitData>
  private _convertFrom?: UnitBase

  constructor(units: Signal<UnitData>, convertFrom?: UnitBase) {
    this._units = units;
    this._convertFrom = convertFrom;
  }

  get units() {
    return this._units;
  }

  get convertFrom() {
    return this._convertFrom;
  }
}

export interface UnitRange {
  standard: [number, number],
  extreme?: [number, number],
  limits: [number | null, number | null]
}

export interface UnitData {
  id: string,
  name: string,
  shortName: string,
  system: UnitSystem | null
  range: UnitRange
}