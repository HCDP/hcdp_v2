import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeafletImageExport } from './leaflet-image-export';

describe('LeafletImageExport', () => {
  let component: LeafletImageExport;
  let fixture: ComponentFixture<LeafletImageExport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeafletImageExport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeafletImageExport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
