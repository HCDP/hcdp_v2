import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorScaleDisplay } from './color-scale-display';

describe('ColorScaleDisplay', () => {
  let component: ColorScaleDisplay;
  let fixture: ComponentFixture<ColorScaleDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorScaleDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColorScaleDisplay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
