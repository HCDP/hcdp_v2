import { Directive, Input, OnChanges, Type, ViewContainerRef } from '@angular/core';
import { TabBase } from "../components/tabs/tab-base/tab-base.js"

@Directive({
  selector: '[appDynamicTabTemplate]',
})
export class DynamicTabTemplate implements OnChanges {
  @Input({ required: true }) component: Type<TabBase>;
  @Input() dataset: any;

  constructor(private container: ViewContainerRef) { }

  ngOnChanges() {
    this.render();
  }

  private render() {
    this.container.clear();
    this.container.createComponent(this.component);
  }

}
