import { Injectable, TemplateRef, ViewContainerRef, ElementRef, inject } from '@angular/core';
import {
  Overlay,
  OverlayPositionBuilder,
  OverlayRef,
  FlexibleConnectedPositionStrategy,
  ConnectedPosition
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Injectable({ providedIn: 'root' })
export class OverlayService {
  private overlay = inject(Overlay);
  private positionBuilder = inject(OverlayPositionBuilder);
  public defaultPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  ];

  openTemplateOverlay(
    trigger: ElementRef,
    template: TemplateRef<any>,
    viewContainerRef: ViewContainerRef,
    positions?: FlexibleConnectedPositionStrategy['positions']
  ): OverlayRef {
    const positionStrategy = this.positionBuilder
      .flexibleConnectedTo(trigger)
      .withPositions(
        positions ?? this.defaultPositions
      );

    const overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    overlayRef.attach(new TemplatePortal(template, viewContainerRef));
    return overlayRef;
  }
}