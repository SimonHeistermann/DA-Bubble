import { Directive, HostListener } from '@angular/core';

@Directive({
  standalone: true,
  selector: 'img[defaultImg]'
})
export class DefaultImgDirective {
  @HostListener('error', ['$event.target'])
  onError(img: HTMLImageElement) {
    img.src = '/angular-projects/dabubble/images/icons/avatars/avatar_1.png';
  }
}