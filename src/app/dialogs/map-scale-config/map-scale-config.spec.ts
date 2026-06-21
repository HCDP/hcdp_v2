import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapScaleConfig } from './map-scale-config';

describe('MapScaleConfig', () => {
  let component: MapScaleConfig;
  let fixture: ComponentFixture<MapScaleConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapScaleConfig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapScaleConfig);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
