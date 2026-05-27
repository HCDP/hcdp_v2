import { TestBed } from '@angular/core/testing';

import { AssetManager } from './asset-manager';

describe('AssetManager', () => {
  let service: AssetManager;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssetManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
