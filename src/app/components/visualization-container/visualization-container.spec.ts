import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualizationContainer } from './visualization-container';

describe('VisualizationContainer', () => {
  let component: VisualizationContainer;
  let fixture: ComponentFixture<VisualizationContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualizationContainer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisualizationContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
