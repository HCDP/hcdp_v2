import { Component, computed, resource } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TabBase } from '../tab-base/tab-base';
import { DatetimeControl } from '../../controls/datetime-control/datetime-control';
import { HCDPDatasetTimeseriesVisualization, HCDPVisSubtypes } from '../../../models/datasets/dataset';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { OptionControlState } from '../../../models/datasets/stateController';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dataset-options',
  imports: [ DatetimeControl, MatButtonToggleModule, MatTooltipModule, MatIconModule, AsyncPipe, MatProgressSpinnerModule ],
  templateUrl: './dataset-options.html',
  styleUrl: './dataset-options.scss',
})
export class DatasetOptions extends TabBase {

  typedDataset = computed(() => {
    return this.dataset() as HCDPVisSubtypes;
  });

  timeseriesData = computed(() => {
    let dataset = this.typedDataset();
    if("timeseriesData" in dataset) {
      return dataset.timeseriesData;
    }
    return undefined;
  });

  controls = computed(() => {
    const controller = this.typedDataset().dataState;
    return Object.values(controller.controlData); 
  });


  controlChange(control: OptionControlState, value: string) {
    control.value.next(value);
  }

}


// special control specific subtypes
type ValidDateControlSubtypes = HCDPDatasetTimeseriesVisualization;