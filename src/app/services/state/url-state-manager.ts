import { inject, Injectable } from '@angular/core';
import { Router, ActivatedRoute, Params, NavigationEnd, Event } from '@angular/router';
import { distinctUntilChanged, filter, map, Observable, pairwise, shareReplay, startWith } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UrlStateManager {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public params: Observable<Params> = this.route.queryParams;

  public paths: Observable<Params> = this.router.events.pipe(
    filter((event: Event): event is NavigationEnd => {
      return event instanceof NavigationEnd;
    }),
    // Force an immediate emission on subscription so late subscribers get the data
    startWith(null),
    distinctUntilChanged((prevEvent, currentEvent) => {
      if (!prevEvent || !currentEvent) return false;
      const getBasePath = (url: string) => url.split('?')[0].split('#')[0];
      const prevPath = getBasePath(prevEvent.urlAfterRedirects);
      const currentPath = getBasePath(currentEvent.urlAfterRedirects);
      return prevPath === currentPath; 
    }),
    map(() => this.currentPaths),
    // Replay the latest path state to any new components that subscribe later
    shareReplay(1) 
  );

  constructor() {}
    
  public get currentParams(): Params {
    return this.router.parseUrl(this.router.url).queryParams;
  }

  public get currentPaths(): Params {
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
