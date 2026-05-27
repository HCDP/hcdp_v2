import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabBase } from './tab-base';

describe('TabBase', () => {
  let component: TabBase;
  let fixture: ComponentFixture<TabBase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabBase]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabBase);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
