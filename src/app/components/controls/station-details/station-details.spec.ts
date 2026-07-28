import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationDetails } from './station-details';

describe('StationDetails', () => {
  let component: StationDetails;
  let fixture: ComponentFixture<StationDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StationDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
