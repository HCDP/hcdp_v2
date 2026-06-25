import { computed, DestroyRef, effect, inject, Injector, signal, Signal, untracked, WritableSignal } from "@angular/core";
import { ControlType, DataOptions, ListControlValue, UnitValue } from "./recipe";
import { DateTime } from "luxon";
import { Configuration } from "../../services/configuration/configuration";
import { UrlStateManager } from "../../services/state/url-state-manager";
import { GlobalPreferenceManager } from "../../services/state/global-preference-manager";
import { HCDPTimeseriesData } from "./timeseries";
import { auditTime, BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, Observable, withLatestFrom } from "rxjs";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";


export class DataStateController {
  globalPreferences = inject(GlobalPreferenceManager);
  urlState = inject(UrlStateManager);
  configService = inject(Configuration);
  destroyRef: DestroyRef = inject(DestroyRef); 
  injector: Injector = inject(Injector);

  protected _controlData: Record<string, OptionControlState> = {};
  
  // The final settled state stream
  public state: Observable<Record<string, string> | undefined>;

  // Converted active stream for RxJS interop
  protected active$: Observable<boolean>;

  constructor(protected active: Signal<boolean>, protected definition: DataOptions) {
    // Convert the signal back to an observable to use in combineLatest and withLatestFrom
    this.active$ = toObservable(this.active, { injector: this.injector });
  }

  public initOptions() {
    let { defaults, controls } = this.definition;
    let defaultState = { ...defaults };
    let currentUrlParams = this.urlState.currentParams; 
    
    let initialMissingParams: Record<string, string> = {};

    // 1. Initialize all controls
    for(let control of controls) {
      this.handleInitControl(control, currentUrlParams, defaultState, initialMissingParams);
    }

    // Batch update missing URL params on load
    if (Object.keys(initialMissingParams).length > 0) {
      this.urlState.updateParams(initialMissingParams);
    }

    // 2. SIMPLIFICATION: Native Derived State
    const controlObservables = controls.map(c => this.getControlObservable(c.id, c.type));
    
    // Replace this.active with this.active$
    this.state = combineLatest([this.active$, ...controlObservables]).pipe(
      map(([isActive, ...values]) => {
        if (!isActive || values.some(v => v === undefined || v === null)) {
          return undefined;
        }

        let stateObject: Record<string, string> = {};
        controls.forEach((control, index) => {
          stateObject[control.id] = values[index];
        });
        
        return stateObject;
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    // 3. Direction 2: External URL Changes -> Controls
    this.urlState.params.pipe(
      withLatestFrom(this.active$), // Replaced with this.active$
      filter(([_, isActive]) => isActive),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(([urlParams]) => {
      let restoreParams: Record<string, string> = {};

      for(let control of controls) {
        this.handleRestoreControl(control, urlParams[control.id], restoreParams, defaultState);
      }

      if (Object.keys(restoreParams).length > 0) {
        this.urlState.updateParams(restoreParams);
      }
    });
  }

  // --- VIRTUAL HOOKS ---

  protected handleInitControl(control: any, currentUrlParams: Record<string, string>, defaultState: Record<string, string>, initialMissingParams: Record<string, string>) {
    let { id, type } = control;

    if (type === "units") {
      let unitPrefs = this.globalPreferences.preferences().preferredUnit;
      for (let unitValue of control.values!) {
        if ((unitValue as UnitValue).system == unitPrefs) {
          defaultState[id] = unitValue.id;
          break;
        }
      }
    }

    let initialValue = defaultState[id]; 
    let urlValue = currentUrlParams[id];

    if (urlValue !== undefined) {
      if (control.values && Array.isArray(control.values)) {
        let isValidOption = control.values.some((v: any) => v.id === urlValue);
        if (isValidOption) initialValue = urlValue;
      } else {
        initialValue = urlValue; 
      }
    }

    if (urlValue === undefined || initialValue !== urlValue) {
      initialMissingParams[id] = initialValue;
    }

    let subject = new BehaviorSubject<string>(initialValue);

    // SIMPLIFICATION: Direction 1 (Controls -> URL)
    subject.pipe(
      distinctUntilChanged(),
      withLatestFrom(this.active$), // Replaced with this.active$
      filter(([_, isActive]): boolean => isActive),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(([value]) => {
      let urlParams = this.urlState.currentParams;
      if (urlParams[id] !== value) {
        this.urlState.updateParams({ [id]: value });
      }
    });

    this._controlData[id] = {
      ...control,
      value: subject
    };
  }

  protected handleRestoreControl(control: any, paramValue: string | undefined, restoreParams: Record<string, string>, defaultState: Record<string, string>) {
    let { id } = control;
    let controlState = this._controlData[id];
    
    if (!controlState) return;

    if (!paramValue) {
      restoreParams[id] = controlState.value.getValue();
      return;
    }

    if (controlState.value.getValue() !== paramValue) {
      let newValueToSet = paramValue;
      let isValid = true;

      if (controlState.values && Array.isArray(controlState.values)) {
        isValid = controlState.values.some((v: any) => v.id === paramValue);
        if (!isValid) newValueToSet = defaultState[id]; 
      }

      if (!isValid) restoreParams[id] = newValueToSet;

      controlState.value.next(newValueToSet); 
    }
  }

  protected getControlObservable(id: string, type: string): Observable<any> {
    return this._controlData[id].value.asObservable();
  }

  get controlData() {
    return this._controlData;
  }
}



export class TimeseriesDataStateController extends DataStateController {

  constructor(
    active: Signal<boolean>, 
    definition: DataOptions, 
    private timeseriesData: HCDPTimeseriesData
  ) {
    super(active, definition);
    this.initOptions(); 
  }

  // --- OVERRIDE HOOKS ---

  protected override handleInitControl(control: any, currentUrlParams: Record<string, string>, defaultState: Record<string, string>, initialMissingParams: Record<string, string>) {
    if(control.type === "date") {
      let id = control.id;
      let currentDate = this.timeseriesData.date; 

      if(currentUrlParams[id]) {
        let initialDate = DateTime.fromISO(currentUrlParams[id], { zone: "UTC" });
        if(initialDate.isValid) {
          this.timeseriesData.setDate(initialDate);
          currentDate = initialDate; 
        }
      }
      else {
        initialMissingParams[id] = this.timeseriesData.period.formatDate(currentDate);
      }

      this.timeseriesData.dateStream.pipe(
        map(date => this.timeseriesData.period.formatDate(date)),
        distinctUntilChanged(),
        withLatestFrom(this.active$), // Replaced with this.active$
        filter(([_, isActive]) => isActive),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(([valueString]) => {
        let urlParams = this.urlState.currentParams;
        if (urlParams[id] !== valueString) {
          this.urlState.updateParams({ [id]: valueString });
        }
      });
      
      this._controlData[id] = {
        ...control,
        value: new BehaviorSubject<string>(this.timeseriesData.period.formatDate(currentDate))
      };
      
      return; 
    }
    
    super.handleInitControl(control, currentUrlParams, defaultState, initialMissingParams);
  }

  protected override handleRestoreControl(control: any, paramValue: string | undefined, restoreParams: Record<string, string>, defaultState: Record<string, string>) {
    if (control.type === "date") {
      let id = control.id;
      let currentDate = this.timeseriesData.date;

      if (!paramValue) {
        restoreParams[id] = this.timeseriesData.period.formatDate(currentDate);
        return;
      }

      let newDate = DateTime.fromISO(paramValue);
      
      if (newDate.isValid) {
        const currentFormatted = this.timeseriesData.period.formatDate(currentDate);
        const incomingFormatted = this.timeseriesData.period.formatDate(newDate);

        if (currentFormatted !== incomingFormatted) {
          this.timeseriesData.setDate(newDate);
        }
      } else {
        restoreParams[id] = this.timeseriesData.period.formatDate(currentDate);
      }
      return;
    }

    super.handleRestoreControl(control, paramValue, restoreParams, defaultState);
  }

  protected override getControlObservable(id: string, type: string): Observable<any> {
    if (type === "date") {
      return this.timeseriesData.dateStream.pipe(
        map(date => this.timeseriesData.period.formatDate(date)),
        distinctUntilChanged()
      );
    }
    return super.getControlObservable(id, type);
  }
}

export interface OptionControlState {
  id: string,
  label: string,
  description: string,
  type: ControlType,
  value: BehaviorSubject<any>,
  values: ListControlValue[] | UnitValue[] | HCDPTimeseriesData
}