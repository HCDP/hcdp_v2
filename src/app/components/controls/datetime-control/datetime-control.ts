import { Component, inject, input, OnInit } from '@angular/core';
import { DatetimeSelector } from '../datetime-selector/datetime-selector';
import { AssetManager } from '../../../services/util/asset-manager';
import { MatIconModule, MatIconRegistry } from "@angular/material/icon"; // Required for <mat-icon>
import { MatButtonModule } from "@angular/material/button"; // Required for mat-mini-fab
import { MatTooltipModule } from "@angular/material/tooltip"; // Required for [matTooltip]
import { HCDPTimeseriesData } from '../../../models/datasets/timeseries';

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
export class DatetimeControl implements OnInit {
  assetService = inject(AssetManager);
  matIconRegistry = inject(MatIconRegistry)

  timeseries = input.required<HCDPTimeseriesData>();
  dateMoveData: MoveButtonData;

  constructor() {
    // load button icons
    let icon = this.assetService.getTrustedResourceURL("/icons/fl_m.svg");
    this.matIconRegistry.addSvgIcon("fl", icon);
    icon = this.assetService.getTrustedResourceURL("/icons/ffl_m.svg");
    this.matIconRegistry.addSvgIcon("ffl", icon);
    icon = this.assetService.getTrustedResourceURL("/icons/el_m.svg");
    this.matIconRegistry.addSvgIcon("el", icon);
    icon = this.assetService.getTrustedResourceURL("/icons/fr_m.svg");
    this.matIconRegistry.addSvgIcon("fr", icon);
    icon = this.assetService.getTrustedResourceURL("/icons/ffr_m.svg");
    this.matIconRegistry.addSvgIcon("ffr", icon);
    icon = this.assetService.getTrustedResourceURL("/icons/er_m.svg");
    this.matIconRegistry.addSvgIcon("er", icon);
  }

  ngOnInit(): void {
    this.constructDateMoveData();
  }

  constructDateMoveData() {
    let period = this.timeseries().period;
    let unit = period.unit;
    let jumpPeriod = period.getHigherOrder();
    let jumpIntervalLabel = jumpPeriod?.getLabel("interval");

    let dateBack: MoveData[] = [{
      tooltip: `Skip to first ${unit}`,
      icon: "el",
      trigger: () => {
        this.timeseries().setToStart();
      }
    }];

    if(jumpIntervalLabel) {
      dateBack.push({
        tooltip: `Move back ${jumpIntervalLabel}`,
        icon: "ffl",
        trigger: () => {
          this.timeseries().jumpBackward();
        }
      });
    }
    
    dateBack.push({
      tooltip: `Previous`,
      icon: "fl",
      trigger: () => {
        this.timeseries().previous();
      }
    });

    let dateForward: MoveData[] = [{
      tooltip: `Next`,
      icon: "fr",
      trigger: () => {
        this.timeseries().next();
      }
    }];

    if(jumpIntervalLabel) {
      dateForward.push({
        tooltip: `Move forward ${jumpIntervalLabel}`,
        icon: "ffr",
        trigger: () => {
          this.timeseries().jumpForward();
        }
      });
    }

    dateForward.push({
      tooltip: `Skip to most recent ${unit}`,
      icon: "er",
      trigger: () => {
        this.timeseries().setToEnd();
      }
    });

    this.dateMoveData = {
      forward: {
        disabled: () => {
          return this.timeseries().date.equals(this.timeseries().end);
        },
        moveData: dateForward
      },
      back: {
        disabled: () => {
          return this.timeseries().date.equals(this.timeseries().start);
        },
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
  disabled: () => boolean,
  moveData: MoveData[]
}

interface MoveData {
  tooltip: string,
  icon: string,
  trigger: () => void
}