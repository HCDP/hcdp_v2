import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { Locations } from "../tabs/locations/locations.js";
import { Timeseries } from "../tabs/timeseries/timeseries.js";
import { Datasets } from "../tabs/datasets/datasets.js"
import { DynamicTabTemplate } from "../../directives/dynamic-tab-template.js"
import { Tab } from '../../models/layout/tabs.js';

@Component({
  selector: 'app-data-panel',
  imports: [ MatTabsModule, DynamicTabTemplate, Datasets ],
  templateUrl: './data-panel.html',
  styleUrl: './data-panel.scss',
})
export class DataPanel {
  
  tabs: Tab[];

  constructor() {
    //temp
    this.tabs = [
      {
        label: "Locations",
        component: Locations
      },
      {
        label: "Timeseries",
        component: Timeseries
      }
    ]
  }
}

