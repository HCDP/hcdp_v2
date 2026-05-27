import { Routes } from '@angular/router';
import { Root } from './components/root/root.js';

export const routes: Routes = [
  {
    path: ":dataset/:view",
    component: Root,
    pathMatch: "full",
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
    redirectTo: "historical_rainfall/visualize"
  }
];
