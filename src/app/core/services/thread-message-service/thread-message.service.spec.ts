import { TestBed } from '@angular/core/testing';

import { ThreadMessageService } from './thread-message.service';

describe('ThreadMessageService', () => {
  let service: ThreadMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreadMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
