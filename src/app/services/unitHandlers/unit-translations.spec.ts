import { TestBed } from '@angular/core/testing';

import { UnitTranslations } from './unit-translations';

describe('UnitTranslations', () => {
  let service: UnitTranslations;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnitTranslations);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
