import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tab-base',
  imports: [],
  templateUrl: './tab-base.html',
  styleUrl: './tab-base.scss',
})
export abstract class TabBase {
  @Input() dataset: any;
}
