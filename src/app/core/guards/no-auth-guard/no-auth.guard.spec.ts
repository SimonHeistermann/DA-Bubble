import { TestBed } from '@angular/core/testing';
import { NoAuthGuard } from './no-auth.guard';
import { Router } from '@angular/router';
import { AuthService } from './../../services/auth-service/auth.service';
import { of } from 'rxjs';

describe('NoAuthGuard', () => {
  let guard: NoAuthGuard;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj<AuthService>('AuthService', [], {
      isAuthenticatedExtended$: of(false)
    });
    const routerMock = jasmine.createSpyObj('Router', ['createUrlTree']);
    
    TestBed.configureTestingModule({
      providers: [
        NoAuthGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerMock }
      ]
    });

    guard = TestBed.inject(NoAuthGuard);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should allow access if user is NOT authenticated', (done) => {
    Object.defineProperty(authServiceSpy, 'isAuthenticatedExtended$', {
      get: () => of(false)
    });

    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('should redirect if user IS authenticated', (done) => {
    const fakeTree = {} as any;
    routerSpy.createUrlTree.and.returnValue(fakeTree);

    Object.defineProperty(authServiceSpy, 'isAuthenticatedExtended$', {
      get: () => of(true)
    });

    guard.canActivate().subscribe(result => {
      expect(result).toBe(fakeTree);
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
      done();
    });
  });
});