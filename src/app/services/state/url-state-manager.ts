import { computed, inject, Injectable } from '@angular/core';
import { Router, ActivatedRoute, Params, NavigationEnd, Event } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GlobalPreferenceManager } from './global-preference-manager';
import { filter, map, pairwise } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UrlStateManager {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private globalPrefs = inject(GlobalPreferenceManager);

  // signal for getting query parameters
  // ActivatedRoute queryParams are global, so this will handle detecting changes
  public paramSignal = toSignal(this.route.queryParams, { initialValue: {} as Params });
  public paramDeltaSignal = toSignal(
    this.route.queryParams.pipe(
      pairwise(),
      map(([prev, curr]) => {
        const delta: Params = {};
        for(const key in curr) {
          if(curr[key] !== prev[key]) {
            delta[key] = curr[key];
          }
        }
        return delta;
      })
    ),
    { initialValue: {} as Params }
  );
  
  // query for getting path params
  // construct from router events
  // ActivatedRoute path params are component based and will not update unless URL changes are made upstream from the provider (provided in root, so will never update)
  public pathSignal = toSignal(
    this.router.events.pipe(
      filter((event: Event) => {
        return event instanceof NavigationEnd;
      }), map(() => {
        let currentRoute = this.route.root;
        while (currentRoute.firstChild) {
          currentRoute = currentRoute.firstChild;
        }
        return currentRoute.snapshot.params;
      })
    ), { initialValue: {} as Params }
  );

  constructor() {}
    

  updateParams(params: Params) {
    this.router.navigate([], {
      relativeTo: this.route, // Note: Be careful here, this is still relative to the ROOT route
      queryParams: params,
      queryParamsHandling: "merge" 
    });
  }

  loadDefaultParams(params: Params) {
    const globalParams = this.globalPrefs.preferences();
    
    const mergedParams = {
      ...params,
      ...globalParams
    };
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: mergedParams
    });
  }

  loadParams(params: Params) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params
    });
  }

  // navigate to dataset view
  navigate(dataset: string, view: string) {
    console.log('Navigating to:', dataset, view);
    this.router.navigate([dataset, view]);
  }
}
