import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeafletCompassRose } from './leaflet-compass-rose';

describe('LeafletCompassRose', () => {
  let component: LeafletCompassRose;
  let fixture: ComponentFixture<LeafletCompassRose>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeafletCompassRose]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeafletCompassRose);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
