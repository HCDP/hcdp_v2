import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatetimeControl } from './datetime-control';

describe('DatetimeControl', () => {
  let component: DatetimeControl;
  let fixture: ComponentFixture<DatetimeControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatetimeControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatetimeControl);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
