import { Component, Input, OnInit, ViewChild, inject, signal, computed, WritableSignal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatExpansionModule, MatSidenavModule, MatButtonModule, MatIconModule, MatListModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  @Input({ required: true }) visualizationSelected!: WritableSignal<boolean>;
  @ViewChild("sidenav") sidenav!: MatSidenav;

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

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      for(let segment of segments) {
        console.log(segment.path); 
      }
    });
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
    this.visualizationSelected.set(visualizationSelected);
    let view = visualizationSelected ? "visualize" : "export";
    this.router.navigate([node.link, view]);
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