import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportContainer } from './export-container';

describe('ExportContainer', () => {
  let component: ExportContainer;
  let fixture: ComponentFixture<ExportContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportContainer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
