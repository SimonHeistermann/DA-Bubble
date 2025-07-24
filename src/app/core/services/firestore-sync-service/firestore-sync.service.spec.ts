import { TestBed } from '@angular/core/testing';

import { FirestoreSyncService } from './firestore-sync.service';

describe('FirestoreSyncService', () => {
  let service: FirestoreSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirestoreSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
