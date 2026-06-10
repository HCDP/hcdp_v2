import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetOptions } from './dataset-options';

describe('DatasetOptions', () => {
  let component: DatasetOptions;
  let fixture: ComponentFixture<DatasetOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetOptions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatasetOptions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
