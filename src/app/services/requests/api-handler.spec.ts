import { TestBed } from '@angular/core/testing';

import { ApiHandler } from './api-handler';

describe('ApiHandler', () => {
  let service: ApiHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiHandler);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
