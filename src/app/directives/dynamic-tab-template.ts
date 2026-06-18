import { Directive, effect, input, Type, ViewContainerRef, inject } from '@angular/core';
import { TabBase } from "../components/tabs/tab-base/tab-base.js"
import { HCDPDataset } from '../models/datasets/dataset.js';

@Directive({
  selector: '[appDynamicTabTemplate]',
})
export class DynamicTabTemplate {
  component = input.required<Type<TabBase>>();
  dataset = input.required<HCDPDataset>();

  private container = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      this.container.clear();
      const componentRef = this.container.createComponent(this.component());
      componentRef.setInput('dataset', this.dataset());
    });
  }

}
