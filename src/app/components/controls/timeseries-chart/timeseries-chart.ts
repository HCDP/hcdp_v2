import { Component, effect, input } from '@angular/core';
import { LineSeriesOption, graphic, EChartsOption } from 'echarts';
import { DateTime } from 'luxon';
import { Period } from '../../../models/datasets/time';
import { NgxEchartsDirective, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import * as echarts from 'echarts';

@Component({
  selector: 'app-timeseries-chart',
  imports: [NgxEchartsDirective],
  templateUrl: './timeseries-chart.html',
  styleUrl: './timeseries-chart.scss',
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts }
    }
  ]
})
export class TimeseriesChart {
  period = input.required<Period>();
  dataStream = input.required<Map<DateTime, number> | null>();

  chartOptions: EChartsOption = {};
  updateOptions: EChartsOption = {}; 

  private accumulatedData = new Map<number, number>(); 

  constructor() {
    this.initChartBase();

    effect(() => {
      const chunk = this.dataStream();

      // reset data on null signal
      if(chunk === null) {
        this.accumulatedData.clear();
        this.updateChart();
        return;
      }

      // merge incoming data
      if(chunk.size > 0) {
        // map to ms dates
        chunk.forEach((value, dateTime) => {
          this.accumulatedData.set(dateTime.toMillis(), value);
        });
        this.updateChart();
      }
    });
  }

  private updateChart() {
    // sort the timestamps
    const sortedTimestamps = Array.from(this.accumulatedData.keys()).sort((a, b) => a - b);
    const processedData: [number, number | null][] = [];
    
    // get rough ms between data points (may not be exact for months)
    // add a buffer for imprecise durations, disconnect data with a larger gap
    const disconnectIntervalMs = this.period().valueOf() * 1.5; 

    // build processed array with nulls injected between gaps
    for(let i = 0; i < sortedTimestamps.length; i++) {
      const currentTs = sortedTimestamps[i];
      processedData.push([currentTs, this.accumulatedData.get(currentTs)!]);

      // check the gap to the next timestamp
      if(i < sortedTimestamps.length - 1) {
        const nextTs = sortedTimestamps[i + 1];
        
        // If the gap is larger than disconnect interval, inject a null value to disconnect the graph
        if(nextTs - currentTs > disconnectIntervalMs) {
          processedData.push([currentTs + disconnectIntervalMs, null]);
        }
      }
    }

    // use ECharts merge to inject data
    this.updateOptions = {
      series: [
        {
          data: processedData
        } as LineSeriesOption
      ]
    };
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

    this.chartOptions = {
      animation: false,
      title: {
        text: 'Rainfall',
        left: 'center',
        textStyle: { color: textColor, fontSize: 16 }
      },
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
        type: 'time',
        boundaryGap: [0, 0], 
        axisLine: { lineStyle: { color: axisLineColor } },
        axisLabel: { color: textColor }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor, formatter: '{value}' },
        splitLine: { lineStyle: { color: axisLineColor, type: 'dashed' } }
      },
      dataZoom: [{ type: 'inside', disabled: false, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false }],
      series: [
        {
          name: 'Rainfall',
          type: 'line',
          symbol: 'none',
          data: [], 
          connectNulls: false, 
          large: true,          
          largeThreshold: 2000, 
          sampling: 'lttb',     
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
    };
  }
}