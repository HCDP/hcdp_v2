import { effect, inject, Service, signal } from '@angular/core';
import { GlobalPreferenceManager } from './global-preference-manager';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Service()
export class LayoutManager {
  readonly globalPrefs = inject(GlobalPreferenceManager);
  private readonly  breakpointObserver = inject(BreakpointObserver);

  layoutStyle = signal<"vertical" | "horizontal">(this.globalPrefs.preferences().layout ?? "vertical");
  smallScreen = signal<boolean>(false);
  
  constructor() {
    effect(() => {
      if(!this.smallScreen()) {
        let layout = this.layoutStyle();
        this.globalPrefs.setParams({ layout });
      }
    });

    this.breakpointObserver
    .observe("(max-width: 1000px)")
    .pipe(takeUntilDestroyed())
    .subscribe(result => {
      if(result.matches) {
        this.smallScreen.set(true);
        this.layoutStyle.set("vertical");
      }
      else {
        this.layoutStyle.set(this.globalPrefs.preferences().layout);
        this.smallScreen.set(false);
      }
    });
  }
}
