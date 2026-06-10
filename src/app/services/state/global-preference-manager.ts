import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalPreferenceManager {
  private readonly STORAGE_KEY = "hcdp_preferences";

  // global preference signal
  private prefsSignal = signal<Record<string, any>>(this.loadFromDisk());
  public preferences = this.prefsSignal.asReadonly();

  // update preferences
  setParams(updates: Record<string, any>) {
    this.prefsSignal.update((currentPrefs: Record<string, any>) => {
      const updatedPrefs = { ...currentPrefs, ...updates };
      
      // save prefs to disk with localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPrefs));
      
      return updatedPrefs;
    });
  }

  // read prefs from disk
  private loadFromDisk(): Record<string, any> {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    let prefs = {};
    if(saved) {
      try {
        prefs = JSON.parse(saved);
      }
      catch(e) {
        console.error("Failed to parse saved preferences, ignoring...", e);
      }
    }
    return prefs;
  }
}
