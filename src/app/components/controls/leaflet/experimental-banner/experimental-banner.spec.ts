import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperimentalBanner } from './experimental-banner';

describe('ExperimentalBanner', () => {
  let component: ExperimentalBanner;
  let fixture: ComponentFixture<ExperimentalBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentalBanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperimentalBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
