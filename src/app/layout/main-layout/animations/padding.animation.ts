import { trigger, transition, style, animate, state } from "@angular/animations";

export const padding20Animation = trigger('padding20', [
    state('closed', style({
        padding: '0',
    })),
    state('open', style({
        padding: '*',
    })),

    transition('closed <=> open', [
    animate('200ms ease-in-out')
    ]),
  ])
  