import { signal, WritableSignal } from "@angular/core";
import { Tab } from "../layout/tabs";

export type AnimationPath = typeof TabManager.ANIMATIONS[keyof typeof TabManager.ANIMATIONS];

export class TabManager {
  public static readonly ANIMATIONS = {
    GRAPH_LOADING: "assets/animations/graph_animation_recolored.gif"
  };

  private _tabs: Tab[];
  private _activeTab: WritableSignal<number>;

  constructor(tabs: Tab[]) {
    this._tabs = tabs;
    this._activeTab = signal(0);
  }

  hasTab(id: string) {
    return this.tabs.find((tab: Tab) => tab.id === id) !== undefined;
  }

  get tabs() {
    return this._tabs;
  }

  set tab(id: string) {
    let index = this.tabs.findIndex((tab: Tab) => tab.id === id);
    if(index >= 0) {
      this._activeTab.set(index);
    }
  }

  get activeTab() {
    return this._activeTab;
  }

  setAnimation(id: string, animation: AnimationPath | null) {
    let tab = this.tabs.find((tab: Tab) => tab.id === id);
    if(tab) {
      tab.animate(animation);
      return true;
    }
    return false;
  }
}