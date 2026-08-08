import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapHeader } from './map-header';

describe('MapHeader', () => {
  let component: MapHeader;
  let fixture: ComponentFixture<MapHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
