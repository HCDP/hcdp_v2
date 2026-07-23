import { inject, Injectable, linkedSignal, signal, WritableSignal } from '@angular/core';
import { GlobalPreferenceManager } from './global-preference-manager';

@Injectable({
  providedIn: 'root',
})
export class ExportGlobalState {
  private globalPrefs = inject(GlobalPreferenceManager);

  private _email = linkedSignal(() => {
    return this.globalPrefs.preferences().email;
  });

  private _licenseAck = signal<boolean>(false);
  

  get email() {
    return this._email;
  }

  get licenseAck() {
    return this._licenseAck;
  }

}