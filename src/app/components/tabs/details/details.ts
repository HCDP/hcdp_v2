import { Component, computed } from '@angular/core';
import { TabBase } from '../tab-base/tab-base';

@Component({
  selector: 'app-details',
  imports: [],
  templateUrl: './details.html',
  styleUrl: './details.scss',
})
export class Details extends TabBase {
  dsDescription = computed(() => {
    return this.dataset().description;
  });
}
