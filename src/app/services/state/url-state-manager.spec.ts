import { TestBed } from '@angular/core/testing';

import { UrlStateManager } from './url-state-manager';

describe('UrlStateManager', () => {
  let service: UrlStateManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UrlStateManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
