import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalSettings } from './global-settings';

describe('GlobalSettings', () => {
  let component: GlobalSettings;
  let fixture: ComponentFixture<GlobalSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
