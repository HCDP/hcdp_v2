import { Component, computed } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TabBase } from '../tab-base/tab-base';
import { DatetimeControl } from '../../controls/datetime-control/datetime-control';
import { HCDPVisSubtypes } from '../../../models/datasets/dataset';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dataset-options',
  imports: [ DatetimeControl, MatButtonToggleModule, MatTooltipModule, MatIconModule, MatProgressSpinnerModule ],
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
    // extract controller state objects
    const state = controller.getControls();
    return state;
  });
}
