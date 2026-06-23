import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportGenerated } from './export-generated';

describe('ExportGenerated', () => {
  let component: ExportGenerated;
  let fixture: ComponentFixture<ExportGenerated>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportGenerated]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportGenerated);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
