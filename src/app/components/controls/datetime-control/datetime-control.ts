import { Component, input } from '@angular/core';
import { DatetimeSelector } from '../datetime-selector/datetime-selector';
import { AssetManager } from '../../../services/util/asset-manager';
import { Period } from '../../../models/datasets/time';
import { MatIconModule, MatIconRegistry } from "@angular/material/icon"; // Required for <mat-icon>
import { MatButtonModule } from "@angular/material/button"; // Required for mat-mini-fab
import { MatTooltipModule } from "@angular/material/tooltip"; // Required for [matTooltip]

@Component({
  selector: 'app-datetime-control',
  imports: [ 
    MatIconModule, 
    MatButtonModule, 
    MatTooltipModule, 
    DatetimeSelector
  ],
  templateUrl: './datetime-control.html',
  styleUrl: './datetime-control.scss',
})
export class DatetimeControl {
  period = input(new Period("year", 1));
  dateMoveData: MoveButtonData;

  constructor(private matIconRegistry: MatIconRegistry, private assetService: AssetManager) {
    // load button icons
    let icon = assetService.getTrustedResourceURL("/icons/fl_m.svg");
    this.matIconRegistry.addSvgIcon("fl", icon);
    icon = assetService.getTrustedResourceURL("/icons/ffl_m.svg");
    this.matIconRegistry.addSvgIcon("ffl", icon);
    icon =  assetService.getTrustedResourceURL("/icons/el_m.svg");
    this.matIconRegistry.addSvgIcon("el", icon);
    icon =  assetService.getTrustedResourceURL("/icons/fr_m.svg");
    this.matIconRegistry.addSvgIcon("fr", icon);
    icon =  assetService.getTrustedResourceURL("/icons/ffr_m.svg");
    this.matIconRegistry.addSvgIcon("ffr", icon);
    icon =  assetService.getTrustedResourceURL("/icons/er_m.svg");
    this.matIconRegistry.addSvgIcon("er", icon);

    this.constructDateMoveData();
  }

  constructDateMoveData() {
    let period = this.period();
    let unit = period.unit;
    let jumpPeriod = period.getHigherOrder();
    let jumpIntervalLabel = jumpPeriod?.getLabel("interval");

    let dateBack: MoveData[] = [{
      tooltip: `Skip to first ${unit}`,
      icon: "el",
      trigger: () => {
      }
    }];

    if(jumpIntervalLabel) {
      dateBack.push({
        tooltip: `Move back ${jumpIntervalLabel}`,
        icon: "ffl",
        trigger: () => {
        }
      });
    }
    
    dateBack.push({
      tooltip: `Previous`,
      icon: "fl",
      trigger: () => {
      }
    });

    let dateForward: MoveData[] = [{
      tooltip: `Next`,
      icon: "fr",
      trigger: () => {
      }
    }];

    if(jumpIntervalLabel) {
      dateForward.push({
        tooltip: `Move forward ${jumpIntervalLabel}`,
        icon: "ffr",
        trigger: () => {
        }
      });
    }

    dateForward.push({
      tooltip: `Skip to most recent ${unit}`,
      icon: "er",
      trigger: () => {
      }
    });

    this.dateMoveData = {
      forward: {
        disabled: false,
        moveData: dateForward
      },
      back: {
        disabled: true,
        moveData: dateBack
      }
    }
  }
}

interface MoveButtonData {
  forward: DirectionGroup,
  back: DirectionGroup
}

interface DirectionGroup {
  disabled: boolean,
  moveData: MoveData[]
}

interface MoveData {
  tooltip: string,
  icon: string,
  trigger: () => void
}