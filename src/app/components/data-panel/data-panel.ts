import { Component, inject, effect, ResourceRef } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { DatasetOptions } from '../tabs/dataset-options/dataset-options.js';
import { DynamicTabTemplate } from "../../directives/dynamic-tab-template.js"
import { Tab } from '../../models/layout/tabs.js';
import { DatasetFactory } from '../../services/datasets/dataset-factory.js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HCDPDataset } from '../../models/datasets/dataset.js';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-data-panel',
  imports: [ MatTabsModule, DynamicTabTemplate, DatasetOptions, MatProgressSpinnerModule, MatButtonModule ],
  templateUrl: './data-panel.html',
  styleUrl: './data-panel.scss',
})
export class DataPanel {
  private dsFactory = inject(DatasetFactory);
  
  datasetResource: ResourceRef<HCDPDataset | undefined>;
  
  tabs: Tab[] = [];

  constructor() {
    this.datasetResource = this.dsFactory.dataset;
    effect(() => {
      let dataset = this.dsFactory.dataset.value();
      if(dataset) {
        this.tabs = dataset.visData.tabs;
      }
    });
  }
}

