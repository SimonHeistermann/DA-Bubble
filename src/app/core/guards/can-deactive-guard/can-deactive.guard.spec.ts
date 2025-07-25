import { TestBed } from '@angular/core/testing';
import { CanDeactivateGuard, CanComponentDeactivate } from './can-deactive.guard';

describe('CanDeactivateGuard', () => {
  let guard: CanDeactivateGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CanDeactivateGuard]
    });

    guard = TestBed.inject(CanDeactivateGuard);
  });

  it('should allow deactivation if component.canDeactivate returns true', () => {
    const component: CanComponentDeactivate = {
      canDeactivate: () => true
    };

    expect(guard.canDeactivate(component)).toBeTrue();
  });

  it('should allow deactivation if hasUnsavedChanges is false', () => {
    const component: CanComponentDeactivate = {
      canDeactivate: undefined,
      hasUnsavedChanges: () => false
    };

    expect(guard.canDeactivate(component)).toBeTrue();
  });

  it('should confirm if hasUnsavedChanges is true', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    const component: CanComponentDeactivate = {
      canDeactivate: undefined,
      hasUnsavedChanges: () => true
    };

    const result = guard.canDeactivate(component);

    expect(window.confirm).toHaveBeenCalledWith(
      'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?'
    );
    expect(result).toBeTrue();
  });

  it('should cancel deactivation if user rejects confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    const component: CanComponentDeactivate = {
      canDeactivate: undefined,
      hasUnsavedChanges: () => true
    };

    const result = guard.canDeactivate(component);

    expect(result).toBeFalse();
  });
});