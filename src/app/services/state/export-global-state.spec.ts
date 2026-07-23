import { TestBed } from '@angular/core/testing';

import { ExportGlobalState } from './export-global-state';

describe('ExportGlobalState', () => {
  let service: ExportGlobalState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportGlobalState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
