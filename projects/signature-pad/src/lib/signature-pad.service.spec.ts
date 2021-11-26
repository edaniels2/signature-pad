import { TestBed } from '@angular/core/testing';

import { SignaturePadService } from './signature-pad.service';

describe('SignaturePadService', () => {
  let service: SignaturePadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignaturePadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
