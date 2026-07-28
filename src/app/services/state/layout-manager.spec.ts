import { TestBed } from '@angular/core/testing';

import { LayoutManager } from './layout-manager';

describe('LayoutManager', () => {
  let service: LayoutManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
