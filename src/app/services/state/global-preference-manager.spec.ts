import { TestBed } from '@angular/core/testing';

import { GlobalPreferenceManager } from './global-preference-manager';

describe('GlobalPreferenceManager', () => {
  let service: GlobalPreferenceManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalPreferenceManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
