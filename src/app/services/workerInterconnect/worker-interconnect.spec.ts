import { TestBed } from '@angular/core/testing';

import { WorkerInterconnect } from './worker-interconnect';

describe('WorkerInterconnect', () => {
  let service: WorkerInterconnect;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkerInterconnect);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
