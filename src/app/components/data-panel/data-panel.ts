import { Component, inject, effect, ResourceRef, input } from '@angular/core';
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
  dataset = input.required<HCDPDataset>();
}

