import { Component } from '@angular/core';
import { TabBase } from '../tab-base/tab-base';
import { DatetimeControl } from '../../controls/datetime-control/datetime-control';

@Component({
  selector: 'app-dataset-options',
  imports: [DatetimeControl],
  templateUrl: './dataset-options.html',
  styleUrl: './dataset-options.scss',
})
export class DatasetOptions extends TabBase {

}
