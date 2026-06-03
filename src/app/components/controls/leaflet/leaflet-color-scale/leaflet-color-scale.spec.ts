import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeafletColorScale } from './leaflet-color-scale';

describe('LeafletColorScale', () => {
  let component: LeafletColorScale;
  let fixture: ComponentFixture<LeafletColorScale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeafletColorScale]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeafletColorScale);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
