import { Component, computed, resource } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TabBase } from '../tab-base/tab-base';
import { DatetimeControl } from '../../controls/datetime-control/datetime-control';
import { HCDPDatasetTimeseriesVisualization } from '../../../models/datasets/dataset';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { OptionControlState } from '../../../models/datasets/state';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dataset-options',
  imports: [ DatetimeControl, MatButtonToggleModule, MatTooltipModule, MatIconModule, AsyncPipe, MatProgressSpinnerModule ],
  templateUrl: './dataset-options.html',
  styleUrl: './dataset-options.scss',
})
export class DatasetOptions extends TabBase {

  stateData = resource({
    params: () => this.dataset(),
    loader: ({ params: dataset }) => {
      return (dataset.visData as ValidDatasetSubtypes).dataState; 
    }
  });

  timeseriesResource = resource({
    params: () => this.dataset(),
    loader: async ({ params: dataset }) => {
      const visData = dataset.visData;
      // if visData does not include timeseriesData just return undefined
      if(visData && "timeseriesData" in visData) {
        const data = visData as ValidDateControlSubtypes;
        return await data.timeseriesData;
      }
      return undefined; 
    }
  });

  controls = computed(() => {
    const controller = this.stateData.value();
    
    if (!controller) return [];

    return Object.values(controller.controlData); 
  });


  controlChange(control: OptionControlState, value: string) {
    control.value.next(value);
  }

}


// union this type with any vis layout subclass compatible with the component. It must contain the relavent properties
type ValidDatasetSubtypes = HCDPDatasetTimeseriesVisualization;
// special control specific subtypes
type ValidDateControlSubtypes = HCDPDatasetTimeseriesVisualization;