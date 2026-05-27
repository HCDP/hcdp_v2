
import { Type } from '@angular/core';
import { TabBase } from "../../components/tabs/tab-base/tab-base.js"

export interface Tab {
  label: string,
  component: Type<TabBase>
};