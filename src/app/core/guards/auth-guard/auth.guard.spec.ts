import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard';
import { Router } from '@angular/router';
import { AuthService } from './../../services/auth-service/auth.service';
import { of } from 'rxjs';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj<AuthService>('AuthService', [], {
      isAuthenticatedExtended$: of(true)
    });
    const routerMock = jasmine.createSpyObj('Router', ['createUrlTree']);
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerMock }
      ]
    });
    guard = TestBed.inject(AuthGuard);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should allow access if user is authenticated', (done) => {
    Object.defineProperty(authServiceSpy, 'isAuthenticatedExtended$', {
      get: () => of(true)
    });

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('should redirect if user is not authenticated', (done) => {
    const fakeTree = {} as any;
    routerSpy.createUrlTree.and.returnValue(fakeTree);

    Object.defineProperty(authServiceSpy, 'isAuthenticatedExtended$', {
      get: () => of(false)
    });

    guard.canActivate().subscribe(result => {
      expect(result).toBe(fakeTree);
      done();
    });
  });
});
