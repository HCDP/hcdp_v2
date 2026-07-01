
import { signal, Type, WritableSignal } from '@angular/core';
import { TabBase } from "../../components/tabs/tab-base/tab-base.js"
import { AnimationPath } from '../datasets/tabManager.js';

export class Tab {
  private _id: string;
  private _label: string;
  private _animation: WritableSignal<AnimationPath | null>;
  private _component: Type<TabBase>;

  constructor(id: string, label: string, component: Type<TabBase>) {
    this._id = id;
    this._label = label;
    this._component = component;
    this._animation = signal<AnimationPath | null>(null);
  }

  get id() {
    return this._id;
  }

  get label() {
    return this._label;
  }

  get component() {
    return this._component;
  }

  get animation() {
    return this._animation.asReadonly();
  }

  animate(animation: AnimationPath | null) {
    this._animation.set(animation);
  }
};