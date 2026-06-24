import { Component, effect, ElementRef, inject, input, model, viewChild } from '@angular/core';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { HCDPStationDataManager, StationData } from '../../../models/datasets/stations';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-station-table',
  imports: [MatTableModule, MatSortModule, MatTooltipModule],
  templateUrl: './station-table.html',
  styleUrl: './station-table.scss',
})
export class StationTable {
  private el = inject(ElementRef);
  manager = input.required<HCDPStationDataManager>();
  
  selectedStation = model<StationData | undefined>(); 
  sort = viewChild.required(MatSort);

  // MatTableDataSource handles sorting
  dataSource = new MatTableDataSource<StationData>([]);
  displayedColumns: string[] = ['skn', 'name', 'island', 'network', 'value'];

  constructor() {
    effect(() => {
      const currentStations = this.manager().filteredStations();
      this.dataSource.data = currentStations;
    });

    effect(() => {
      this.dataSource.sort = this.sort();
    });

    effect(() => {
      const activeId = this.selectedStation()?.skn;
      
      if(activeId) {
        // short pause for sorting and other effects
        setTimeout(() => {
          // Find the specific row element using the attribute we added
          const rowElement = this.el.nativeElement.querySelector(`[data-skn="${activeId}"]`);
          
          if(rowElement) {
            rowElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 50);
      }
    });
  }

  selectStation(station: StationData) {
    this.selectedStation.set(station);
  }
}
