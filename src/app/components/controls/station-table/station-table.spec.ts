import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationTable } from './station-table';

describe('StationTable', () => {
  let component: StationTable;
  let fixture: ComponentFixture<StationTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StationTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
