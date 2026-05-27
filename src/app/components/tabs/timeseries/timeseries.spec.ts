import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Timeseries } from './timeseries';

describe('Timeseries', () => {
  let component: Timeseries;
  let fixture: ComponentFixture<Timeseries>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Timeseries]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Timeseries);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
