import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit, NgZone } from '@angular/core';
import { TabBase } from "../tab-base/tab-base";
import * as echarts from 'echarts';
import { LineSeriesOption } from 'echarts';
import { DateTime } from 'luxon';
import { NgxEchartsDirective, NGX_ECHARTS_CONFIG } from 'ngx-echarts';

@Component({
  selector: 'app-timeseries',
  imports: [ NgxEchartsDirective ],
  templateUrl: './timeseries.html',
  styleUrl: './timeseries.scss',
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts }
    }
  ]
})
export class Timeseries extends TabBase {
  
 chartOptions: echarts.EChartsOption = {};

  ngAfterViewInit() {
  const rawData = this.generateData();

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

  const areaGradientColor = primaryColor + '66'; // 40% transparency

  // 3. Define the COMPLETE options payload all at once to prevent engine collisions
  this.chartOptions = {
    title: {
      text: 'Temperature (1960 - Present)',
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
        dataZoom: {
          yAxisIndex: 'none',
          title: { zoom: 'Box Zoom', back: 'Reset Zoom' }
        },
        saveAsImage: {
          title: 'Export PNG',
          pixelRatio: window.devicePixelRatio,
          type: 'png',
          excludeComponents: ['toolbox']
        }
      },
      iconStyle: { borderColor: textColor }
    },
    grid: {
      top: 80,
      left: 60,
      right: 60,
      bottom: 60
    },
    // CRITICAL FIX: Explicitly populated xAxis configuration
    xAxis: {
      type: 'time',
      boundaryGap: [0, 0], 
      axisLine: { lineStyle: { color: axisLineColor } },
      axisLabel: { color: textColor }
    },
    // CRITICAL FIX: Explicitly populated yAxis configuration
    yAxis: {
      type: 'value',
      axisLabel: { 
        color: textColor,
        formatter: '{value}°C' 
      },
      splitLine: { lineStyle: { color: axisLineColor, type: 'dashed' } }
    },
    dataZoom: [
      {
        type: 'inside',
        disabled: false,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false
      }
    ],
    series: [
      {
        name: 'Temperature',
        type: 'line',
        symbol: 'none',
        data: rawData,
        large: true,          
        largeThreshold: 2000, 
        sampling: 'lttb',     
        itemStyle: { color: primaryColor },
        lineStyle: { width: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: areaGradientColor },
            { offset: 1, color: primaryColor + '00' }
          ])
        }
      } as LineSeriesOption
    ]
  };
}

  /**
   * Generates a structural 2D Tuple Array format natively optimized for ECharts:
   * [ [DateString, Value], [DateString, Value], ... ]
   */
  private generateData(): [number, number][] {
    let date = DateTime.fromISO("1960-01-01");
    const end = DateTime.now();
    const data: [number, number][] = [];

    while (date < end) {
      // Your actual weather metric or math calculation
      const seasonPhase = Math.sin((date.toSeconds() / 31536000) * Math.PI * 2);
      const value = 20 + (seasonPhase * 15) + ((Math.random() * 6) - 3);
      
      data.push([date.valueOf(), parseFloat(value.toFixed(2))]);
      
      // Increment the timeline (e.g., daily, hourly, etc.)
      date = date.plus({ hours: 1 }); 
    }

    return data;
  }
}
