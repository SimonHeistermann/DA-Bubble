import { TestBed } from '@angular/core/testing';

import { DashboardResponsiveService } from './dashboard-responsive.service';

describe('DashboardResponsiveService', () => {
  let service: DashboardResponsiveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardResponsiveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
