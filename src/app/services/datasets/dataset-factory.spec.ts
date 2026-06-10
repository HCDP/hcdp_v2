import { TestBed } from '@angular/core/testing';

import { DatasetFactory } from './dataset-factory';

describe('DatasetFactory', () => {
  let service: DatasetFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatasetFactory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
