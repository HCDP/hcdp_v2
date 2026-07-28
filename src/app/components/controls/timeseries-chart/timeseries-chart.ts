import { Component, computed, input, ChangeDetectionStrategy, output, effect, linkedSignal } from '@angular/core';
import { LineSeriesOption, graphic, EChartsOption } from 'echarts';
import { DateTime } from 'luxon';
import { NgxEchartsDirective, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import * as echarts from 'echarts';
import { HCDPTimeseriesData } from '../../../models/datasets/timeseries';
import { DatetimeSelector } from '../datetime-selector/datetime-selector';
import { Period } from '../../../models/datasets/time';
import { TitleCasePipe } from '@angular/common';
import { Statistics } from '../../../models/general/stats';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-timeseries-chart',
  imports: [
    NgxEchartsDirective, 
    DatetimeSelector,
    TitleCasePipe,
    MatButtonModule
  ],
  templateUrl: './timeseries-chart.html',
  styleUrl: './timeseries-chart.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts }
    }
  ]
})
export class TimeseriesChart {
  timeseriesData = input.required<HCDPTimeseriesData>();
  dataStream = input.required<Map<DateTime, number> | null>();
  dataLabel = input.required<string>();
  date = input.required<DateTime>();

  startDate = linkedSignal(() => {
    return this.timeseriesData().start;
  });
  endDate = linkedSignal(() => {
    return this.timeseriesData().end;
  });

  viewportStats = output<Statistics>();

  // baseline options
  chartOptions: EChartsOption = this.initChartBase();
  private chartInstance?: echarts.ECharts;

  initOpts = { 
    devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2) 
  };

  zoomPeriods = computed(() => {
    const periods: Period[] = [];
    const basePeriod = this.timeseriesData().period; 
    
    // Iteratively grab the next higher order until it returns null
    let nextPeriod = basePeriod.getHigherOrder();
    while (nextPeriod !== null) {
      periods.push(nextPeriod);
      nextPeriod = nextPeriod.getHigherOrder();
    }
    
    return periods;
  });

  updateOptions = computed<EChartsOption>(() => {
    const rawMap = this.dataStream();

    const { period } = this.timeseriesData();

    // 1. Handle reset / null state immediately
    if (!rawMap || rawMap.size === 0) {
      return {
        replaceMerge: ['series'],
        series: [{ data: [] } as LineSeriesOption] };
    }

    // 2. Convert map to epoch tuples and sort them chronologically 
    // (We must sort because concurrent API chunks arrive out of order)
    const sortedEntries = Array.from(rawMap.entries())
      .map(([dt, val]) => [dt.toMillis(), val] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    
    const expectedIntervalMs = period.valueOf(); 
    const processedData: [number, number | null][] = [];

    // 3. Build the array and inject nulls for missing chunks
    for (let i = 0; i < sortedEntries.length; i++) {
      const [currentTs, val] = sortedEntries[i];
      processedData.push([currentTs, val]);

      // Check gap to the next known point
      if (i < sortedEntries.length - 1) {
        const nextTs = sortedEntries[i + 1][0];
        
        // If gap exceeds expected interval, inject a null to break the ECharts line
        // (Added a 1.5x buffer to prevent float math rounding errors from triggering false gaps)
        if (nextTs - currentTs > expectedIntervalMs * 1.5) {
          processedData.push([currentTs + expectedIntervalMs, null]);
        }
      }
    }

    // set min zoom level to one period higher than ds interval
    let minZoomSpan = period.getHigherOrder()?.valueOf();

    return {
      replaceMerge: ['series'],
      tooltip: {
        formatter: (params: any) => {
          if (!params || params.length < 1) return '';
          
          const timestamp = params[0].value[0];
          const val = params[0].value[1];
          
          const formattedTime = this.timeseriesData().formatMs(timestamp, "locale");
            
          const marker = params[0].marker;
          const seriesName = params[0].seriesName || 'Value';
          
          return `${formattedTime}<br/>${marker} ${seriesName}: <b>${val}</b>`;
        }
      },
      xAxis: {
        axisLabel: {
          formatter: (value: number) => {
            return this.timeseriesData().formatMs(value, "locale");
          },
          
        },
        axisPointer: {
          label: {
            formatter: (params: any) => {        
              return this.timeseriesData().formatMs(params.value, "locale");
            }
          }
        }
      },
      yAxis: {
        name: this.dataLabel(), 
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: {
          fontSize: 15
        }
      },
      dataZoom: [
        {
          minValueSpan: minZoomSpan
        }
      ],
      series: [{ name: this.dataLabel(), data: processedData } as LineSeriesOption]
    };
  });







  constructor() {
    effect(() => {
      const rawMap = this.dataStream();
      if (rawMap && this.chartInstance) {
        // Use a small timeout to let ECharts finish rendering the new data 
        // before we query its internal zoom state
        setTimeout(() => this.updateViewportStats(), 100);
      }
    });

    effect(() => {
      const start = this.startDate();
      const end = this.endDate();
      const chart = this.chartInstance;

      if (start && end && chart) {
        const startMs = start.toMillis();
        const endMs = end.toMillis();
        
        // Check current chart zoom state
        const option = chart.getOption() as any;
        const currentStartMs = option.dataZoom?.[0]?.startValue;
        const currentEndMs = option.dataZoom?.[0]?.endValue;

        // Only dispatch if the dates are actually different from what the chart is showing
        if (startMs !== currentStartMs || endMs !== currentEndMs) {
          chart.dispatchAction({
            type: 'dataZoom',
            startValue: startMs,
            endValue: endMs
          });
        }
      }
    });
  }

  onChartInit(ec: echarts.ECharts) {
    this.chartInstance = ec;
  }

  onDataZoom() {
    this.updateViewportStats();
  }

  zoomToAll() {
    if (!this.chartInstance) return;

    this.chartInstance.dispatchAction({
      type: 'dataZoom',
      // Using percentages instead of exact values easily resets the entire view
      start: 0,
      end: 100 
    });

    this.updateViewportStats();
  }

  zoomTo(period: Period) {
    if (!this.chartInstance) return;

    const targetDate = this.date();
    
    // Extract the strict luxon unit (e.g., 'month', 'year') from the Period class
    const unit = period.unit; 

    // Dynamically calculate the start and end of that unit
    const startMs = targetDate.startOf(unit).toMillis();
    const endMs = targetDate.endOf(unit).toMillis();

    this.chartInstance.dispatchAction({
      type: 'dataZoom',
      startValue: startMs,
      endValue: endMs
    });

    this.updateViewportStats();
  }

  private updateViewportStats() {
    if (!this.chartInstance) return;
    
    const rawMap = this.dataStream();
    if (!rawMap || rawMap.size === 0) return;

    // 1. Get the current visible bounds directly from the ECharts configuration
    const option = this.chartInstance.getOption() as any;
    let startMs = option.dataZoom?.[0]?.startValue;
    let endMs = option.dataZoom?.[0]?.endValue;

    // Fallback just in case ECharts hasn't fully registered the zoom yet
    if (startMs === undefined || endMs === undefined) {
       const keys = Array.from(rawMap.keys());
       startMs = keys[0].toMillis();
       endMs = keys[keys.length - 1].toMillis();
    }

    // 2. Variables to calculate stats
    // Note: We use a loop instead of Math.max(...array) because large datasets 
    // (e.g. 100,000+ points) will trigger a Maximum Call Stack Size Exceeded error.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;
    let actualStartMs = Infinity;
    let actualEndMs = -Infinity;

    // 3. First Pass: Get Min, Max, and Mean
    for (const [dt, val] of rawMap.entries()) {
      const ms = dt.toMillis();
      
      if (ms >= startMs && ms <= endMs) {
        // NEW: Skip missing, null, or invalid data points
        if (val === null || val === undefined || Number.isNaN(Number(val))) {
          continue; 
        }

        const numericVal = Number(val);

        if (numericVal < min) min = numericVal;
        if (numericVal > max) max = numericVal;
        sum += numericVal;
        count++;
        
        // Track the actual start/end dates of the visible data points
        if (ms < actualStartMs) actualStartMs = ms;
        if (ms > actualEndMs) actualEndMs = ms;
      }
    }

    if (count === 0) return; // Prevent division by zero if zoom area is empty

    const mean = sum / count;
    
    // 4. Second Pass: Calculate Standard Deviation
    let sumSqDiff = 0;
    for (const [dt, val] of rawMap.entries()) {
      const ms = dt.toMillis();
      if (ms >= startMs && ms <= endMs) {
        // NEW: Apply the exact same skip logic here
        if (val === null || val === undefined || Number.isNaN(Number(val))) {
          continue; 
        }

        sumSqDiff += Math.pow(Number(val) - mean, 2);
      }
    }
    
    const stddev = Math.sqrt(sumSqDiff / count);

    let startDate = DateTime.fromMillis(actualStartMs);
    let endDate = DateTime.fromMillis(actualEndMs);

    this.startDate.set(startDate);
    this.endDate.set(endDate);

    this.viewportStats.emit({
      min,
      max,
      mean,
      stddev
    });
  }














  private initChartBase() {
    // 1. Extract styles natively
    const styles = getComputedStyle(document.body);
    let primaryColor = styles.getPropertyValue('--mat-sys-on-primary-container').trim() || '#1976d2';
    const textColor = styles.getPropertyValue('--mat-sys-on-surface').trim() || '#333333';
    const axisLineColor = styles.getPropertyValue('--mat-sys-outline-variant').trim() || '#ccc';

    // 2. Resolve the light-dark() CSS function cleanly
    if (primaryColor.startsWith('light-dark')) {
      const matches = primaryColor.match(/light-dark\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
      if (matches) {
        const isDarkMode = document.body.classList.contains('dark-theme') || 
                           document.body.classList.contains('dark-mode') ||
                           window.matchMedia('(prefers-color-scheme: dark)').matches;
        primaryColor = isDarkMode ? matches[2].trim() : matches[1].trim();
      }
    }

    const areaGradientColor = primaryColor + '66';

    return {
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      toolbox: {
        right: 10,
        feature: {
          dataZoom: { yAxisIndex: 'none', title: { zoom: 'Box Zoom', back: 'Reset Zoom' } },
          saveAsImage: { title: 'Export PNG', pixelRatio: window.devicePixelRatio, type: 'png', excludeComponents: ['toolbox'] }
        },
        iconStyle: { borderColor: textColor }
      },
      grid: { top: 80, left: 60, right: 60, bottom: 60 },
      xAxis: {
        name: 'Timestamp',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: 15
        },
        type: 'time',
        boundaryGap: [0, 0],
        axisLine: { lineStyle: { color: axisLineColor } },
        axisLabel: { color: textColor, hideOverlap: true }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor, formatter: '{value}' },
        splitLine: { lineStyle: { color: axisLineColor, type: 'dashed' } }
      },
      dataZoom: [{ type: 'inside', disabled: false, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false }],
      series: [
        {
          type: 'line',
          symbol: 'none',
          data: [], 
          connectNulls: false,
          // causes some visual artifacting at null gaps, may need this with hourly data, leave off for now
          // large: true,
          // largeThreshold: 100000, 
          // sampling: 'lttb',     
          itemStyle: { color: primaryColor },
          lineStyle: { width: 1.5 },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: areaGradientColor },
              { offset: 1, color: primaryColor + '00' }
            ])
          }
        } as LineSeriesOption
      ]
    } as EChartsOption;
  }
}