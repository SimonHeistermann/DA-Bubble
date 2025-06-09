import { animate, state, style, transition, trigger } from '@angular/animations';

export const verticalMarginExpandCollapseAnimation = trigger('verticalMarginExpandCollapse', [
  state('closed', style({
    height: '0',
    opacity: 0,
    marginTop: '0px',
  })),
  state('open', style({
    height: '*',
    marginTop: '25px',
    opacity: 1,
  })),

  transition('closed <=> open', [
    animate('200ms ease-in-out')
  ]),
]);

export const verticalExpandCollapseAnimation = trigger('verticalExpandCollapse', [
  state('closed', style({
    height: '0',
    opacity: 0,
  })),
  state('open', style({
    height: '*',
    opacity: 1,
  })),

  transition('closed <=> open', [
    animate('200ms ease-in-out')
  ]),
]);

export const toggleMarginRight20Animation = trigger('toggleMarginRight20', [
  state('closed', style({
    width: '0',
    opacity: 0,
    marginRight: '0',
  })),
  state('open', style({
    width: '*',
    opacity: 1,
    
    marginRight: '20px',
  })),

  transition('closed <=> open', [
    animate('200ms ease-in-out')
  ]),
]);
