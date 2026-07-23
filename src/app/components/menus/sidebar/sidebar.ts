import { Component, OnInit, ViewChild, inject, signal, computed, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { UrlStateManager } from '../../../services/state/url-state-manager';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatExpansionModule, MatSidenavModule, MatButtonModule, MatIconModule, MatListModule, RouterModule, MatProgressSpinnerModule],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  private urlStateManager = inject(UrlStateManager);

  hierarchyResource = httpResource<DatasetSelectorNode[]>(() => '/assets/data/data-hierarchy.json');

  slideNext = signal<boolean>(false);
  navStack = signal<DatasetSelectorNode[][]>([]);
  breadcrumbs = signal<string[]>([]);

  currentNodes = computed(() => {
    const stack = this.navStack();
    if (stack.length > 0) {
      return stack[stack.length - 1]; 
    }
    return this.hierarchyResource.value() ?? []; 
  });

  parents = computed(() => this.navStack());

  

  ngOnInit(): void {

  }

  nextMenu(node: DatasetSelectorCategoryNode) {
    this.slideNext.set(true);
    this.navStack.update(stack => [...stack, node.nodes]);
    this.breadcrumbs.update(crumbs => [...crumbs, node.label]);
  }

  previousMenu() {
    this.slideNext.set(false);
    this.navStack.update(stack => {
      const newStack = [...stack];
      newStack.pop();
      return newStack;
    });
    this.breadcrumbs.update(crumbs => {
      const newCrumbs = [...crumbs];
      newCrumbs.pop();
      return newCrumbs;
    });
  }

  jumpToBreadcrumb(index: number) {
    this.slideNext.set(false);
    this.navStack.update(stack => stack.slice(0, index + 1));
    this.breadcrumbs.update(crumbs => crumbs.slice(0, index + 1));
  }

  goHome() {
    this.slideNext.set(false);
    this.navStack.set([]);
    this.breadcrumbs.set([]);
  }

  selectViewComponent(node: DatasetSelectorDatasetNode, visualizationSelected: boolean) {
    let view = visualizationSelected ? "visualize" : "export";
    this.urlStateManager.navigate(node.link, view);
  }
}

export interface DatasetSelectorNode {
  type: "category" | "dataset";
  label: string;
}

export interface DatasetSelectorCategoryNode extends DatasetSelectorNode {
  type: "category";
  nodes: DatasetSelectorNode[];
}

export interface DatasetSelectorDatasetNode extends DatasetSelectorNode {
  type: "dataset";
  description: string;
  link: string;
}