import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationFilters } from './station-filters';

describe('StationFilters', () => {
  let component: StationFilters;
  let fixture: ComponentFixture<StationFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StationFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
