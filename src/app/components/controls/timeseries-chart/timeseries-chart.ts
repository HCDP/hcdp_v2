import { Component, computed, effect, input } from '@angular/core';
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

  // Baseline options (Static, sets up axes/colors/styles)
  chartOptions: EChartsOption = this.initChartBase();

  // --- THE BETTER WAY ---
  // A computed signal that automatically derives the ECharts update payload
  // anytime dataStream or period changes. No effect() needed!
  updateOptions = computed<EChartsOption>(() => {
    const rawMap = this.dataStream();

    // 1. Handle reset / null state immediately
    if (!rawMap || rawMap.size === 0) {
      return { series: [{ data: [] } as LineSeriesOption] };
    }

    // 2. Convert map to epoch tuples and sort them chronologically 
    // (We must sort because concurrent API chunks arrive out of order)
    const sortedEntries = Array.from(rawMap.entries())
      .map(([dt, val]) => [dt.toMillis(), val] as [number, number])
      .sort((a, b) => a[0] - b[0]);

    const expectedIntervalMs = this.period().valueOf(); 
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

    // 4. Return the merge payload
    return {
      series: [{ data: processedData } as LineSeriesOption]
    };
  });

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
    } as EChartsOption;
  }
}