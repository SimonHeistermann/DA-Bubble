import { TestBed } from '@angular/core/testing';

import { GuestLoginService } from './guest-login.service';

describe('GuestLoginService', () => {
  let service: GuestLoginService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuestLoginService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
