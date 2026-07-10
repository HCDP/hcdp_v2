import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute, Params, NavigationEnd, Event } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UrlStateManager {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public params: Signal<Params> = toSignal(this.route.queryParams, {
    initialValue: this.currentParams
  });

  public paths: Signal<Params> = toSignal(
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => {
        return event instanceof NavigationEnd;
      }),
      distinctUntilChanged((prevEvent, currentEvent) => {
        if (!prevEvent || !currentEvent) return false;
        const getBasePath = (url: string) => url.split('?')[0].split('#')[0];
        const prevPath = getBasePath(prevEvent.urlAfterRedirects);
        const currentPath = getBasePath(currentEvent.urlAfterRedirects);
        return prevPath === currentPath; 
      }),
      map(() => this.currentPaths)
    ),
    { initialValue: this.currentPaths }
  );

    
  private get currentParams(): Params {
    return this.router.parseUrl(this.router.url).queryParams;
  }

  private get currentPaths(): Params {
    let currentRoute = this.router.routerState.root.snapshot;
    while(currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    return currentRoute.params;
  }
    
  updateParams(params: Params) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: "merge" 
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
    // clean slashes off of path variables
    dataset = dataset.replace(/^\/+|\/+$/g, '');
    view = view.replace(/^\/+|\/+$/g, '');
    let currentDataset = this.currentPaths;
    
    // only navigate if actually changing the path
    if(currentDataset.dataset !== dataset || currentDataset.view !== view) {
      this.router.navigate([dataset, view]);
    }
  }
}