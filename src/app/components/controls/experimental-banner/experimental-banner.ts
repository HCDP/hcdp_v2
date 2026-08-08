import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-experimental-banner',
  imports: [MatTooltipModule],
  templateUrl: './experimental-banner.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './experimental-banner.scss',
})
export class ExperimentalBanner {

}
