import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLocationSelector } from './map-location-selector';

describe('MapLocationSelector', () => {
  let component: MapLocationSelector;
  let fixture: ComponentFixture<MapLocationSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapLocationSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapLocationSelector);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
