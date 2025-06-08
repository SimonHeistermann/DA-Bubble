import { animate, state, style, transition, trigger } from '@angular/animations';

export const expandCollapseAnimation = trigger('expandCollapse', [
  state('closed', style({
    height: '0',
    opacity: 0,
    paddingTop: '0',
    paddingBottom: '0',
  })),
  state('open', style({
    height: '*',
    opacity: 1,
    paddingTop: '*',
    paddingBottom: '*',
  })),

  transition('closed <=> open', [
    animate('200ms ease-in-out')
  ]),
]);
