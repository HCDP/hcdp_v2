import { Component, inject, effect, ResourceRef } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { DynamicTabTemplate } from "../../directives/dynamic-tab-template.js"
import { DatasetFactory } from '../../services/datasets/dataset-factory.js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HCDPDataset } from '../../models/datasets/dataset.js';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-data-panel',
  imports: [ MatTabsModule, DynamicTabTemplate, MatProgressSpinnerModule, MatButtonModule ],
  templateUrl: './data-panel.html',
  styleUrl: './data-panel.scss',
})
export class DataPanel {
  private dsFactory = inject(DatasetFactory);
  
  datasetResource: ResourceRef<HCDPDataset | undefined>;

  dataset: HCDPDataset;

  constructor() {
    this.datasetResource = this.dsFactory.dataset;
    effect(() => {
      let dataset = this.dsFactory.dataset.value();
      if(dataset) {
        this.dataset = dataset;
      }
    });
  }
}

