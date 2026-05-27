import { TestBed } from '@angular/core/testing';

import { DateFormatHelper } from './date-format-helper';

describe('DateFormatHelper', () => {
  let service: DateFormatHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateFormatHelper);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
