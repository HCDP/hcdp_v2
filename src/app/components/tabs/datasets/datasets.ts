import { Component } from '@angular/core';
import { TabBase } from "../tab-base/tab-base";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { DatetimeControl } from '../../controls/datetime-control/datetime-control';

@Component({
  selector: 'app-datasets',
  imports: [MatButtonToggleModule, MatTooltipModule, MatIconModule, DatetimeControl],
  templateUrl: './datasets.html',
  styleUrl: './datasets.scss',
})
export class Datasets extends TabBase {

}
