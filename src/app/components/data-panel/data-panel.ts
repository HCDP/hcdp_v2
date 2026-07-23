import { Component, computed, ElementRef, HostBinding, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { DynamicTabTemplate } from "../../directives/dynamic-tab-template.js"
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {  HCDPDatasetVisualization } from '../../models/datasets/dataset.js';
import { MatButtonModule } from '@angular/material/button';
import { ScrollDispatcher } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-data-panel',
  imports: [ MatTabsModule, DynamicTabTemplate, MatProgressSpinnerModule, MatButtonModule ],
  templateUrl: './data-panel.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './data-panel.scss',
})
export class DataPanel implements OnInit {
  private scrollDispatcher = inject(ScrollDispatcher);
  private elementRef = inject(ElementRef);

  dataset = input.required<HCDPDatasetVisualization>();
  tabManager = computed(() => {
    return this.dataset().tabManager;
  });
  
  
  private resizeObserver: ResizeObserver;
  private activeScrollContainer: HTMLElement | null = null;

  public showTopShadow = signal(false);
  public showBottomShadow = signal(false);

  @HostBinding('class.show-top-shadow') 
  get topShadow() { 
    return this.showTopShadow(); 
  }
  
  @HostBinding('class.show-bottom-shadow') 
  get bottomShadow() { 
    return this.showBottomShadow(); 
  }

  ngOnInit(): void {
    // 1. Evaluate shadows on manual scroll
    this.scrollDispatcher.scrolled().subscribe((scrollable) => {
      if (
        scrollable && 
        this.activeScrollContainer === scrollable.getElementRef().nativeElement
      ) {
        this.evaluateShadows(this.activeScrollContainer);
      }
    });

    // 2. Evaluate shadows on container resize (dragbar or dynamic data)
    this.resizeObserver = new ResizeObserver(() => {
      if (this.activeScrollContainer) {
        this.evaluateShadows(this.activeScrollContainer);
      }
    });
  }

  ngAfterViewInit(): void {
    this.attachObservers()
  }

  ngOnDestroy(): void {
    if(this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  public attachObservers(): void {
    // Clear previous observers to prevent memory leaks
    this.resizeObserver.disconnect();
    
    // Find the actively displayed Material tab content wrapper
    this.activeScrollContainer = this.elementRef.nativeElement.querySelector(".mat-mdc-tab-body-active .mat-mdc-tab-body-content");
    
    if(this.activeScrollContainer) {
      // Observe the scroll container itself (catches outer dragbar resizes)
      this.resizeObserver.observe(this.activeScrollContainer);
      
      // Observe the inner data tab (catches dynamic table/chart expansion)
      const innerDataTab = this.activeScrollContainer.querySelector('.data-tab');
      if(innerDataTab) {
        this.resizeObserver.observe(innerDataTab);
      }
      
      // Observe the host element
      this.resizeObserver.observe(this.elementRef.nativeElement);

      // Force an immediate evaluation
      this.evaluateShadows(this.activeScrollContainer);
    }
  }

  private evaluateShadows(element: HTMLElement): void {
    const scrollTop = Math.ceil(element.scrollTop);
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;

    // Verify a scrollbar actually exists (using a 1px sub-pixel buffer)
    const hasScrollbar = scrollHeight > (clientHeight + 1);

    if (!hasScrollbar) {
      this.showTopShadow.set(false);
      this.showBottomShadow.set(false);
      return;
    }

    const maxScroll = Math.floor(scrollHeight - clientHeight);
    
    this.showTopShadow.set(scrollTop > 0);
    this.showBottomShadow.set(scrollTop < maxScroll);
  }
}