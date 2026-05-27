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

    //check if dataset component has already been rendered
    // if(this.dataset) {
    //     ref.setInput('config', this.dataset);
    // }
    //for now just create component
    this.container.createComponent(this.component);
    
    // 3. Example: Manually subscribing to an output (hard to do with ngComponentOutlet)
    // if (ref.instance instanceof SomeBaseClass) {
    //    ref.instance.save.subscribe(() => console.log('Saved!'));
    // }
  }

}
