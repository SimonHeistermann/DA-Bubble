import { AfterViewInit, Directive, ElementRef, HostListener, TestabilityRegistry } from '@angular/core';

@Directive({
  selector: 'textarea[autoResize]',
  standalone: true,
})
export class AutoResizeDirective {
  private mirrorDiv: HTMLDivElement;
  constructor(private el: ElementRef<HTMLTextAreaElement>) {

    this.mirrorDiv = document.createElement('div');
    this.initMirror();
  }

  private initMirror() {
    const mirror = this.mirrorDiv;
    const style = window.getComputedStyle(this.el.nativeElement);

    mirror.style.position = 'absolute';
    mirror.style.top = '-9999px';
    mirror.style.left = '0';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';

    // Copy essential styles
    mirror.style.font = '16px';
    mirror.style.lineHeight = '25px';

    mirror.style.padding = '0 20px';
    mirror.style.boxSizing = 'border-box';
    mirror.style.minHeight = '25px';

    document.body.appendChild(mirror);
  }


  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  ngAfterViewInit() {
    this.resize();
  }

  private resize() {
    const textarea = this.el.nativeElement;
    const mirror = this.mirrorDiv;

    // Sanitize and sync content
    let value = textarea.value.trim();
    mirror.textContent = value ? value + '\n' : '';

    // Apply same width in case of resize
    mirror.style.width = window.getComputedStyle(textarea).width;

    const newHeight = mirror.offsetHeight;
    textarea.style.height = newHeight + 'px';
  }
}