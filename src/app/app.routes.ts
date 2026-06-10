import { ActivatedRouteSnapshot, Router, Routes } from '@angular/router';
import { Root } from './components/root/root.js';
import { inject } from '@angular/core';
import { DatasetFactory } from "./services/datasets/dataset-factory.js"

export const routes: Routes = [
  {
    path: ":dataset/:view",
    component: Root,
    pathMatch: "full",
    // redirect invalid links
    canActivate: [
      (route: ActivatedRouteSnapshot) => {
        const dsFactory = inject(DatasetFactory);
        const validDatasets = Object.keys(dsFactory.DS_DEF_INDEX);
        const validViews = ["visualize", "export"];
        let view = route.paramMap.get("view");
        let dataset = route.paramMap.get("dataset");
        let valid = true;
        if(!view || !validViews.includes(view)) {
          valid = false; 
          view = "visualize";
        }
        if(!dataset || !validDatasets.includes(dataset)) {
          valid = false;
          dataset = dsFactory.DEFAULT_DS_ID;
        }
        if(valid) {
          return true;
        }
        const router = inject(Router);
        return router.createUrlTree([dataset, view], {
          queryParams: route.queryParams
        });
      }
    ],
    children: [
      {
        path: '**',
        redirectTo: '..'
      }
    ]
  },
  {
    path: ":dataset",
    pathMatch: "full",
    redirectTo: ":dataset/visualize"
  },
  {
    path: "**",
    redirectTo: "contemporary-rainfall-daily/visualize"
  }
];
