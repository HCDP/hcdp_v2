import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatetimeSelector } from './datetime-selector';

describe('DatetimeSelector', () => {
  let component: DatetimeSelector;
  let fixture: ComponentFixture<DatetimeSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatetimeSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatetimeSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
