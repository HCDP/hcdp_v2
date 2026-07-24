import { Component, computed, effect, inject, resource, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { TabBase } from "../tab-base/tab-base";
import { TimeseriesChart } from '../../controls/timeseries-chart/timeseries-chart';
import { HCDPDatasetTimeseriesVisualization } from '../../../models/datasets/dataset';
import { DateTime } from 'luxon';
import { Params } from '@angular/router';
import { ApiHandler } from '../../../services/requests/api-handler';
import { firstValueFrom, map } from 'rxjs';
import { DataStreamType } from '../../../models/datasets/recipe';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RasterData } from '../../../models/leaflet/rasterData';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { TabManager } from '../../../models/datasets/tabManager';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-timeseries',
  imports: [ TimeseriesChart, MatProgressSpinnerModule, DecimalPipe, MatTableModule, MatCardModule, MatIconModule ],
  templateUrl: './timeseries.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './timeseries.scss'
})
export class Timeseries extends TabBase {
  private animationTimeout: number | undefined;

  apiHandler = inject(ApiHandler);

  dataStream = signal<Map<DateTime, number> | null>(null);

  timeseriesInfo = signal<TimeseriesInfo | null>(null);

  castDataset = computed(() => {
    // requires dataset to be timeseries vis
    let dataset = this.dataset() as HCDPDatasetTimeseriesVisualization;
    return dataset;
  });

  subtext = computed(() => {
    let datatype = this.castDataset();
    return datatype.valueLabel();
  });

  tabManager = computed(() => {
    return this.dataset().tabManager;
  });

  period = computed(() => {
    return this.castDataset().timeseriesData.period;
  });

  rasterData = computed(() => {
    let rasterStreams = this.castDataset().dataStreams.getStreamsOfType("raster");
    // assume one for now
    for(let streamId in rasterStreams) {
      if(rasterStreams[streamId].hasValue()) {
        let rasterData: RasterData = rasterStreams[streamId].value();
        return rasterData;
      }
    }
    return undefined;
  });

  displayedColumns: string[] = ['metric', 'value'];

  statsDataSource = computed(() => {
    const data = this.rasterData();
    
    // Return empty array if data isn't loaded yet
    if (!data) return [];

    return [
      { metric: `Minimum`, value: data.min },
      { metric: `Maximum`, value: data.max },
      { metric: `Mean`, value: data.mean },
      { metric: `Standard Deviation`, value: data.stddev }
    ];
  });



  timeseriesDataResource = resource({
    params: () => this.timeseriesInfo(),
    loader: async ({ params: info, abortSignal }) => {
      this.dataStream.set(null);

      if(!info) return null;

      const dateChunks = this.castDataset().dateChunks;

      const chunkRequests = dateChunks.map(async (dateRange: [DateTime, DateTime]) => {
        let data = await (info.type == "raster" ? this.createRasterTSQuery(info, dateRange, abortSignal) : this.createStationTSQuery(info, dateRange, abortSignal));

        this.dataStream.update(current => {
          const updatedMap = current ? new Map(current) : new Map();
          data.forEach((val, key) => updatedMap.set(key, val.toFixed(2)));
          return updatedMap;
        });
      });

      try {
        await Promise.all(chunkRequests);
      }
      catch (e: any) {
        if(e.name !== 'AbortError') {
          throw e;
        }
      }

      return true;
    }
  });

  private async createStationTSQuery(info: TimeseriesInfo, dateRange: [DateTime, DateTime], abortSignal: AbortSignal): Promise<Map<DateTime, number>> {
    let ep = "/stations/value";

    let [ start, end ] = dateRange;
    const queryParams = {
      ...info.params,
      startDate: this.period().formatDate(start), 
      endDate: this.period().formatDate(end)
    };

    const data = await firstValueFrom(
      this.apiHandler.get<any>(ep, {
        params: queryParams,
        abortSignal: abortSignal
      }).pipe(map((values: any) => {
        let tsMap = new Map<DateTime, number>();
        for(let item of values) {
          let { value: valueData } = item;
          let { value, date } = valueData;
          tsMap.set(DateTime.fromISO(date), value);
        }
        return tsMap;
      }))
    );
    return data;
  }

  private async createRasterTSQuery(info: TimeseriesInfo, dateRange: [DateTime, DateTime], abortSignal: AbortSignal): Promise<Map<DateTime, number>> {
    let ep = "/raster/timeseries";

    let [ start, end ] = dateRange;
    const queryParams = {
      ...info.params,
      start: start.toISO(), 
      end: end.toISO()
    };

    const data = await firstValueFrom(
      this.apiHandler.get<any>(ep, {
        params: queryParams,
        abortSignal: abortSignal
      }).pipe(map((values: Record<string, number>) => {
        let tsMap = new Map<DateTime, number>();
        for(let ts in values) {
          tsMap.set(DateTime.fromISO(ts), values[ts]);
        }
        return tsMap;
      }))
    );
    return data;
  }







  constructor() {
    super();

    effect(() => {
      let location = this.castDataset().locationManager.location();
      
      if(!location) {
        this.timeseriesInfo.set(null);
        return;
      }

      let label: string;
      if(location.type == "map") {
        let { lat, lng } = location.location;
        label = `${lat.toFixed(4)}, ${lng.toFixed(4)} Timeseries Data`;
      }
      else {
        let { name, skn } = location.location;
        label = `${name} (SKN: ${skn}) Timeseries Data`;
      }

      untracked(() => {
        // reset animation timeout
        clearTimeout(this.animationTimeout);
        // set graph indicator animation for 10 seconds
        this.tabManager().setAnimation("timeseries", TabManager.ANIMATIONS.GRAPH_LOADING);
        this.animationTimeout = setTimeout(() => {
          this.tabManager().setAnimation("timeseries", null);
          this.animationTimeout = undefined;
        }, 10000);
      });

      let streamIds: string[] = [];
      let streamType: DataStreamType;
      let baseParams: Params = {};
      if(location.type == "map") {
        streamType = "raster";
        baseParams = {
          ...location.location
        }
      }
      else {
        streamType = "stations";
        baseParams.station_id = location.location.skn;
      }
      streamIds = this.castDataset().dataStreams.getStreamIdsOfType(streamType);
      // if no streams for the selected type reset and ignore
      if(streamIds.length < 0) {
        this.timeseriesInfo.set(null);
        return;
      }
      // assume one for now
      let streamId = streamIds[0];
      // get the stream params
      let params = this.castDataset().dataStreams.getStreamParams(streamId)();
      if(!params) {
        this.timeseriesInfo.set(null);
        return;
      }
      let mergedParams = {
        ...baseParams,
        ...params
      }
      if(mergedParams.date) {
        delete mergedParams.date
      }
      
      let timeseriesInfo = new TimeseriesInfo(streamType, mergedParams, label);
      untracked(() => {
        let currentTimeseriesInfo = this.timeseriesInfo();
        if(currentTimeseriesInfo === null || !timeseriesInfo.equal(currentTimeseriesInfo)) {
          this.timeseriesInfo.set(timeseriesInfo);
        }
      });
      
    });
  }
}

class TimeseriesInfo {
  private _type: DataStreamType;
  private _params: Params
  private _label: string;

  constructor(type: DataStreamType, params: Params, label: string) {
    this._type = type;
    this._params = params;
    this._label = label;
  }

  get type() {
    return this._type;
  }

  get params() {
    return this._params;
  }

  get label() {
    return this._label;
  }

  public equal(compare: TimeseriesInfo): boolean {
    if (this._type !== compare.type) {
      return false;
    }

    const thisKeys = Object.keys(this._params);
    const compareKeys = Object.keys(compare.params);

    if (thisKeys.length !== compareKeys.length) {
      return false;
    }

    for(const key of thisKeys) {
      if(this._params[key as keyof typeof this._params] !== compare.params[key as keyof typeof compare.params]) {
        return false;
      }
    }

    return true;
  }
}