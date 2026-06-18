import { TestBed } from '@angular/core/testing';

import { StationMetadataRetreiver } from './station-metadata-retreiver';

describe('StationMetadataRetreiver', () => {
  let service: StationMetadataRetreiver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StationMetadataRetreiver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
