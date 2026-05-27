import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeafletHeader } from './leaflet-header';

describe('LeafletHeader', () => {
  let component: LeafletHeader;
  let fixture: ComponentFixture<LeafletHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeafletHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeafletHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
