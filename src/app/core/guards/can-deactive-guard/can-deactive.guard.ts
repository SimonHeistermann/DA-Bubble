import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanComponentDeactivate {
  canDeactivate?: () => Observable<boolean> | Promise<boolean> | boolean;
  hasUnsavedChanges?(): boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CanDeactivateGuard implements CanDeactivate<CanComponentDeactivate> {

  canDeactivate(component: CanComponentDeactivate): Observable<boolean> | Promise<boolean> | boolean {
    if (component.canDeactivate) {
      return component.canDeactivate();
    }
    if (component.hasUnsavedChanges && component.hasUnsavedChanges()) {
      return confirm(
        'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?'
      );
    }
    return true;
  }
}
