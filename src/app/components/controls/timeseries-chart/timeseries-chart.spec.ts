import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeseriesChart } from './timeseries-chart';

describe('TimeseriesChart', () => {
  let component: TimeseriesChart;
  let fixture: ComponentFixture<TimeseriesChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeseriesChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeseriesChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
