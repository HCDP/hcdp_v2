
import { DataGroup, UnitBase, UnitSystem, UnitValue } from "./recipe";
import { DataStreamController, StreamData } from "./dataStreams";
import { DataStateController, OptionState } from "./stateController";
import { Resource, ResourceRef, signal, Signal, WritableSignal } from "@angular/core";

export class DataGroupManager {
  private _dataGroup: WritableSignal<DataGroupHandler>;
  private _groups: DataGroupHandler[];

  constructor(groups: DataGroup[], streamManager: DataStreamController, stateController: DataStateController) {
    this._groups = groups.map((group: DataGroup) => {
      const { id, label, description, streams, units } = group;

      const { source, convertFrom } = units;

      let streamMap: Record<string, StreamData> = {};
      for(let streamId of streams) {
        streamMap[streamId] = streamManager.getStreamData()
      }
      let streamResources = streams.map((streamId: string) => streamManager.getStreamData(streamId));
      let unitSignal: Signal<UnitValue>;
      // if linked to dynamic controller get state signal
      if(typeof source === "string") {
        let controller = stateController.getControl(source) as OptionState<"units">;
        controller.
        unitSignal = controller.value;
      }
      // otherwise set signal with static value;
      else {
        unitSignal = signal<UnitValue>(source).asReadonly();
      }
      let unitHandler = new UnitHandler(unitSignal, convertFrom);
      let groupHandler = new DataGroupHandler(id, label, description, streamResources, unitHandler);
      return groupHandler;
    });
  }

  get dataGroupSignal() {
    return this._dataGroup;
  }

  get dataGroups() {
    return [ ...this._groups ];
  }
}

export class DataGroupHandler {
  private _id: string;
  private _label: string;
  private _description: string;
  private _resources: Resource<any>[];
  private _unitHandler: UnitHandler;

  constructor(id: string, label: string, description: string, resources: ResourceRef<any>[], unitHandler: UnitHandler) {
    this._id = id;
    this._label = label;
    this._description = description;
    this._resources = resources;
    this._unitHandler = unitHandler;
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