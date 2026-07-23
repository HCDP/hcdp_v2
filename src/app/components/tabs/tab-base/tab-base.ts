import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { HCDPDatasetVisualization } from '../../../models/datasets/dataset';

@Component({
  selector: 'app-tab-base',
  imports: [],
  templateUrl: './tab-base.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tab-base.scss',
})
export abstract class TabBase {
  dataset = input.required<HCDPDatasetVisualization>();
}
