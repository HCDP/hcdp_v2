import { effect, inject, Injector, signal, Signal, untracked, WritableSignal } from "@angular/core";
import { AnyOptionControlData, ControlType, DataOptions, ListControlValue, OptionControlData, UnitValue } from "./recipe";
import { DateTime } from "luxon";
import { UrlStateManager } from "../../services/state/url-state-manager";
import { GlobalPreferenceManager } from "../../services/state/global-preference-manager";
import { Params } from "@angular/router";

export class DataStateController {
  private globalPreferences = inject(GlobalPreferenceManager);
  private urlState = inject(UrlStateManager);
  private injector: Injector = inject(Injector);

  private _controlData: Record<string, AnyOptionStateController> = {};
  
  private _active: Signal<boolean>;

  constructor(active: Signal<boolean>, definition: DataOptions) {
    let { defaults, controls } = definition;
    let defaultState = { ...defaults };

    this._active = active;

    this.handleGlobalPrefs(controls, defaultState)
    this.initControls(controls, defaultState);
    this.handleUrlChanges(controls);

  }


  //////////////////////////////////////////////////////////////
  //////////////////// Global Preferences //////////////////////
  //////////////////////////////////////////////////////////////

  private handleGlobalPrefs(controls: AnyOptionControlData[], defaultState: Record<string, string>) {
    effect(() => {
      const globalPrefs = this.globalPreferences.preferences();

      const { preferredUnit } = globalPrefs;
      if(preferredUnit) {
        for(let control of controls) {
          let { id, type, values } = control;
          if(type === "units") {
            let unitValues = values as UnitValue[];
            for(let unitValue of unitValues) {
              if(unitValue.system == preferredUnit) {
                defaultState[id] = unitValue.id;
                let controlState = this._controlData[id] as OptionStateController<"units">;
                if(controlState) {
                  controlState.state.value = unitValue;
                }
                break;
              }
            }
          }
        }
      }
    });
  }


  //////////////////////////////////////////////////////////////
  ////////////////// Initialize Control Data ///////////////////
  //////////////////////////////////////////////////////////////
  

  private initControl(control: AnyOptionControlData, urlParams: Params, defaultState: Record<string, string>, updateParams: Params) {
    const { id, type } = control;

    const urlValue = urlParams[id];
    const defaultValue = defaultState[id];

    let controller: AnyOptionStateController;
    switch(type) {
      case "units": {
        controller = new UnitStateController(control, urlValue, defaultValue, updateParams);
        break
      }
      case "list": {
        controller = new ListStateController(control, urlValue, defaultValue, updateParams);
        break
      }
      case "date": {
        controller = new DateStateController(control, urlValue, defaultValue, updateParams);
        break;
      }
    }

    this._controlData[id] = controller;
    this.handleControlChanges(controller);
  }


  private initControls(controlData: AnyOptionControlData[], defaultState: Record<string, string>) {
    const urlParams = this.urlState.params();
    const updateParams: Params = {};
    
    for (let control of controlData) {
      
      this.initControl(control, urlParams, defaultState, updateParams)
    }

    if (!this.triggerGuard() && Object.keys(updateParams).length > 0) {
      this.urlState.updateParams(updateParams);
    }
  }


  //////////////////////////////////////////////////////////////
  //////////////////// Update Control Data /////////////////////
  //////////////////////////////////////////////////////////////


  private updateControls(controlData: AnyOptionControlData[], urlParams: Params) {
    let updateParams: Params = {};
    for(let control of controlData) {
      let { id } = control;
      let urlValue: string | undefined = urlParams[id];

      const controller = this._controlData[id];

      if(urlValue === undefined) {
        updateParams[id] = controller.state.stringValue;
      }
      else {
        controller.updateControl(urlValue, updateParams);
      }
    }
    // guarded in caller
    if(Object.keys(updateParams).length > 0) {
      this.urlState.updateParams(updateParams);
    }
  }


  //////////////////////////////////////////////////////////////
  /////////////////// State Trigger Handlers ///////////////////
  //////////////////////////////////////////////////////////////

  // URL -> Controls trigger
  private handleUrlChanges(controlData: AnyOptionControlData[]) {
    effect(() => {
      // check trigger guard
      if(this.triggerGuard()) return;

      const urlParams = this.urlState.params();
      untracked(() => {
        this.updateControls(controlData, urlParams);
      });
    }, { injector: this.injector });
  }

  // Controls -> URL trigger
  private handleControlChanges(controller: AnyOptionStateController) {
    const { id } = controller.state;
    effect(() => {
      // check if updates guarded
      if(this.triggerGuard()) return;
      // get control string representation based on control type
      let stringVal: string = controller.state.stringValue;
      untracked(() => {
        let urlParams = this.urlState.params();
        // ensure value isn't equivalent to current state
        if(urlParams[id] !== stringVal) {
          this.urlState.updateParams({ [id]: stringVal });
        }
      });    
    }, { injector: this.injector });
  }



  //////////////////////////////////////////////////////////////
  //////////////////////////// Util ////////////////////////////
  //////////////////////////////////////////////////////////////

  private triggerGuard() {
    const urlPaths = this.urlState.paths();
    const active = this._active();
    let guard = false;
    // Pause updates if inactive or not in visualize view
    if(!active || urlPaths["view"] !== "visualize") {
      guard = true;
    }
    return guard;
  }


  //////////////////////////////////////////////////////////////
  ////////////////////// Public Accessors //////////////////////
  //////////////////////////////////////////////////////////////

  public get controlIDs() {
    return Object.keys(this._controlData);
  }

  public getControls() {
    return Object.values(this._controlData);
  }

  public getControl(id: string) {
    return this._controlData[id];
  }
}










export interface ControlValueTypeMap {
  units: UnitValue;
  list: ListControlValue;
  date: DateTime;
}

export type AnyOptionStateController = {
  [K in ControlType]: OptionStateController<K>
}[ControlType];

export class OptionState<T extends ControlType> {
  private _getStringValue: () => string;
  private _controlData: OptionControlData<T>
  private _value: WritableSignal<ControlValueTypeMap[T]>

  constructor(controlData: OptionControlData<T>, value: WritableSignal<ControlValueTypeMap[T]>, getStringValue: () => string) {
    this._controlData = controlData;
    this._value = value;
    this._getStringValue = getStringValue;
  }

  get stringValue(): string {
    return this._getStringValue();
  }

  get id() {
    return this._controlData.id;
  }

  get label() {
    return this._controlData.label;
  }

  get description() {
    return this._controlData.description;
  }

  set value(value: ControlValueTypeMap[T]) {
    this._value.set(value);
  }

  get value() {
    return this._value();
  }

  get valueSignal() {
    return this._value.asReadonly();
  }

  get type() {
    return this._controlData.type;
  }
}


export abstract class OptionStateController<T extends ControlType> {
  protected _state: OptionState<T>;
  protected _value: WritableSignal<ControlValueTypeMap[T]>;
  protected _controlData: OptionControlData<T>;

  constructor(controlData: OptionControlData<T>, urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params) {
    this._controlData = controlData;

    this.initControl(urlValue, defaultValue, updateParams);
    this._state = new OptionState<T>(controlData, this._value, this.getStringValue.bind(this));
  }

  protected abstract initControl(urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params): void;
  abstract updateControl(urlValue: string, updateParams: Params): void;
  protected abstract getStringValue(): string;


  get state() {
    return this._state
  }
}


export class UnitStateController extends OptionStateController<"units"> {

  constructor(controlData: OptionControlData<"units">, urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params) {
    super(controlData, urlValue, defaultValue, updateParams);
  }

  get type(): "units" {
    return "units";
  }


  protected initControl(urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params) {    
    let setURL = true;
    let { id, values } = this._controlData;

    if(values.length === 0) {
      throw new Error(`Invalid data: Control ${id} was initialized with an empty values array.`);
    }

    let initialValueId = defaultValue;

    // if the url has a value for this control and it is valid, initialize to the url value
    if(urlValue !== undefined && values.some((v: UnitValue) => v.id === urlValue)) {
      initialValueId = urlValue;
      // the url is already set, does not need to be updated
      setURL = false;
    }

    const initialValue = values.find((v: UnitValue) => v.id === initialValueId) ?? values[0];
    // if url param for this control is not loaded or invalid add it to updateParams
    if(setURL) {
      updateParams[id] = initialValue.id;
    }

    this._value = signal(initialValue);
  }

  updateControl(urlValue: string, updateParams: Params) {
    let { id, values } = this._controlData;

    let newValue: UnitValue | undefined;
    const currentControlValue = this._value();
    // if the current control string is already equivalent to the url value, skip
    if(currentControlValue.id !== urlValue) {
      newValue = values.find((v: UnitValue) => v.id === urlValue);
      if(newValue === undefined) {
        updateParams[id] = currentControlValue.id;
      }
    }
    if(newValue) {
      this._value.set(newValue);
    }
  }

  protected getStringValue() {
    return this._value().id;
  }
}



export class ListStateController extends OptionStateController<"list"> {

  constructor(controlData: OptionControlData<"list">, urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params) {
    super(controlData, urlValue, defaultValue, updateParams);
  }

  get type(): "list" {
    return "list";
  }


  protected initControl(urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params) {    
    let setURL = true;
    let { id, values } = this._controlData;

    if(values.length === 0) {
      throw new Error(`Invalid data: Control ${id} was initialized with an empty values array.`);
    }

    let initialValueId = defaultValue;

    // if the url has a value for this control and it is valid, initialize to the url value
    if(urlValue !== undefined && values.some((v: ListControlValue) => v.id === urlValue)) {
      initialValueId = urlValue;
      // the url is already set, does not need to be updated
      setURL = false;
    }

    const initialValue = values.find((v: ListControlValue) => v.id === initialValueId) ?? values[0];
    // if url param for this control is not loaded or invalid add it to updateParams
    if(setURL) {
      updateParams[id] = initialValue.id;
    }

    this._value = signal(initialValue);
  }

  updateControl(urlValue: string, updateParams: Params) {
    let { id, values } = this._controlData;

    let newValue: ListControlValue | undefined;
    const currentControlValue = this._value();
    // if the current control string is already equivalent to the url value, skip
    if(currentControlValue.id !== urlValue) {
      newValue = values.find((v: ListControlValue) => v.id === urlValue);
      if(newValue === undefined) {
        updateParams[id] = currentControlValue.id;
      }
    }
    if(newValue) {
      this._value.set(newValue);
    }
  }

  protected getStringValue() {
    return this._value().id;
  }
}



export class DateStateController extends OptionStateController<"date"> {

  constructor(controlData: OptionControlData<"date">, urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params) {
    super(controlData, urlValue, defaultValue, updateParams);
  }

  get type(): "date" {
    return "date";
  }


  protected initControl(urlValue: string | undefined, defaultValue: string | undefined, updateParams: Params) {    
    let setURL = true;
    let { id, values } = this._controlData;
    let setDefault = true;
    // default to end date if not specified
    let initialDate: DateTime = values.end;
    // if a value is provided in the URL parse and validate value
    if(urlValue) {
      let urlDate = DateTime.fromISO(urlValue);
      // check if url date is valid
      if(urlDate.isValid) {
        // url provided valid date, do not set default
        setDefault = false;
        // correct date to timeseries and set initial date
        initialDate = values.checkDate(urlDate);
        // if corrected date is equal to the url date URL is already fine
        if(urlDate.equals(initialDate)) {
          setURL = false;
        }
      }
    }
    // if set default flag is set, attempt to use default if provided
    if(setDefault && defaultValue) {
      let defaultDate = DateTime.fromISO(defaultValue);
      // check if default date is valid
      if(defaultDate.isValid) {
        // correct date to timeseries data
        initialDate = values.checkDate(defaultDate);
      }
    }
    // if url value not provided or needs to be corrected, set update
    if(setURL) {
      // use period formatted date
      const formattedDate = values.period.formatDate(initialDate);
      updateParams[id] = formattedDate;
    }

    this._value = signal(initialDate);
  }


  updateControl(urlValue: string, updateParams: Params) {
    let { id, values } = this._controlData;

    const urlDate = DateTime.fromISO(urlValue);
    const currentDate = this._value();
    
    // check if url date is valid
    if(urlDate.isValid) {
      // update date with
      const correctedDate = values.checkDate(urlDate);
      // if the corrected date is different than the provided url date, update in URL
      if(!urlDate.equals(correctedDate)) {
        // default formatting to period formatting
        const formattedDate = values.period.formatDate(correctedDate);
        updateParams[id] = formattedDate;
      }
      // if the current date is not equal to the corrected url date, set the control value
      if(!currentDate.equals(correctedDate)) {
        this._value.set(correctedDate);
      }
    }
    // if invlid reset url param to current date
    else {
      // default formatting to period formatting
      const formattedDate = values.period.formatDate(currentDate);
      updateParams[id] = formattedDate;
    }
  }

  protected getStringValue() {
    return this._controlData.values.period.formatDate(this._value());
  }
}