import { TestBed } from '@angular/core/testing';

import { ColorStore } from './color-store';

describe('ColorStore', () => {
  let service: ColorStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ColorStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
