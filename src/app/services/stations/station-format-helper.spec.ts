import { TestBed } from '@angular/core/testing';

import { StationFormatHelper } from './station-format-helper';

describe('StationFormatHelper', () => {
  let service: StationFormatHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StationFormatHelper);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
