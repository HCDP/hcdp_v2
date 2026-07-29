import { Component, effect, ElementRef, inject, input, model, viewChild, ChangeDetectionStrategy, afterNextRender, signal, computed, DestroyRef } from '@angular/core';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { StationData } from '../../../models/datasets/stations';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StationFormatHelper } from '../../../services/stations/station-format-helper';

@Component({
  selector: 'app-station-table',
  imports: [MatTableModule, MatSortModule, MatTooltipModule],
  templateUrl: './station-table.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './station-table.scss',
})
export class StationTable {
  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  formatHelper = inject(StationFormatHelper);

  stations = input.required<StationData[]>();
  selectedStation = model<StationData | undefined>(); 
  
  sort = viewChild.required(MatSort);
  
  // Grab the container element for resizing
  tableContainer = viewChild.required<ElementRef<HTMLDivElement>>('tableContainer');

  dataSource = new MatTableDataSource<StationData>([]);
  
  // Responsive Table State
  isCompact = signal(false);
  private fullTableThreshold = 0;

  // Computed signal that automatically updates the table when isCompact changes
  displayedColumns = computed(() => {
    return this.isCompact() 
      ? ['skn', 'name', 'value'] 
      : ['skn', 'name', 'island', 'network', 'value'];
  });

  constructor() {
    effect(() => {
      const currentStations = this.stations();
      this.dataSource.data = currentStations;
    });

    effect(() => {
      this.dataSource.sort = this.sort();
    });

    effect(() => {
      const activeId = this.selectedStation()?.skn;
      if(activeId) {
        setTimeout(() => {
          const rowElement = this.el.nativeElement.querySelector(`[data-skn="${activeId}"]`);
          if(rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
    });

    // Set up the ResizeObserver safely
    afterNextRender(() => {
      const containerEl = this.tableContainer().nativeElement;

      const resizeObserver = new ResizeObserver(() => {
        const clientWidth = containerEl.clientWidth;
        const scrollWidth = containerEl.scrollWidth;

        if (!this.isCompact()) {
          // If content is larger than container, it's overflowing
          if (scrollWidth > clientWidth) {
            this.fullTableThreshold = scrollWidth; // Save the exact width it broke at
            this.isCompact.set(true);              // Shrink it
          }
        } else {
          // If we are compact, check if we have enough room to expand back
          if (this.fullTableThreshold > 0 && clientWidth >= this.fullTableThreshold) {
            this.isCompact.set(false);
          }
        }
      });

      resizeObserver.observe(containerEl);

      // Clean up the observer when the component is destroyed
      this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    });
  }

  selectStation(station: StationData) {
    this.selectedStation.set(station);
  }
}
