import { AfterViewInit, Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: 'textarea[autoResize]',
  standalone: true,
})
export class AutoResizeDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLTextAreaElement>) {}

  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  ngAfterViewInit() {
    this.resize();
  }

  private resize() {
    const textArea = this.el.nativeElement;
    textArea.style.height = 'auto'; // reset first
    textArea.style.height = `${textArea.scrollHeight}px`;
  }
}