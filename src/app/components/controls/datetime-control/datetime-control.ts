import { Component, computed, inject, input, model, OnInit, Signal } from '@angular/core';
import { DatetimeSelector } from '../datetime-selector/datetime-selector';
import { AssetManager } from '../../../services/util/asset-manager';
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { HCDPTimeseriesData } from '../../../models/datasets/timeseries';
import { DateTime } from 'luxon';

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
  date = model.required<DateTime>();

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
        const startDate = this.timeseries().start;
        this.date.set(startDate);
      }
    }];

    if(jumpIntervalLabel) {
      dateBack.push({
        tooltip: `Move back ${jumpIntervalLabel}`,
        icon: "ffl",
        trigger: () => {
          const jumpDate = this.timeseries().jumpBackward(this.date())!;
          this.date.set(jumpDate);
        }
      });
    }
    
    dateBack.push({
      tooltip: `Previous`,
      icon: "fl",
      trigger: () => {
        const previousDate = this.timeseries().previous(this.date());
        this.date.set(previousDate);
      }
    });

    let dateForward: MoveData[] = [{
      tooltip: `Next`,
      icon: "fr",
      trigger: () => {
        const nextDate = this.timeseries().next(this.date());
        this.date.set(nextDate);
      }
    }];

    if(jumpIntervalLabel) {
      dateForward.push({
        tooltip: `Move forward ${jumpIntervalLabel}`,
        icon: "ffr",
        trigger: () => {
          const jumpDate = this.timeseries().jumpForward(this.date())!;
          this.date.set(jumpDate);
        }
      });
    }

    dateForward.push({
      tooltip: `Skip to most recent ${unit}`,
      icon: "er",
      trigger: () => {
        const endDate = this.timeseries().end;
        this.date.set(endDate);
      }
    });

    this.dateMoveData = {
      forward: {
        disabled: computed(() => {
          return this.date().equals(this.timeseries().end);
        }),
        moveData: dateForward
      },
      back: {
        disabled: computed(() => {
          return this.date().equals(this.timeseries().start);
        }),
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
  disabled: Signal<boolean>,
  moveData: MoveData[]
}

interface MoveData {
  tooltip: string,
  icon: string,
  trigger: () => void
}