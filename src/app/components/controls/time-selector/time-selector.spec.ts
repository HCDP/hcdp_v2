import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeSelector } from './time-selector';

describe('TimeSelector', () => {
  let component: TimeSelector;
  let fixture: ComponentFixture<TimeSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
