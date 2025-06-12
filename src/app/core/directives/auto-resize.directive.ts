import { AfterViewInit, Directive, ElementRef, HostListener, Input, TestabilityRegistry } from '@angular/core';

interface AutoResizeStyles {
  fontSize?: string;
  lineHeight?: string;
  padding?: string;
  [key: string]: any; 
}

@Directive({
  selector: 'textarea[autoResize]',
  standalone: true,
})
export class AutoResizeDirective implements AfterViewInit{
  private mirrorDiv: HTMLDivElement | null = null;
  @Input() styles: Partial<AutoResizeStyles> = {};

  constructor(private el: ElementRef<HTMLTextAreaElement>) {
    
  }


  private applyDefaultStyle(mirror: HTMLDivElement) {
    const style = window.getComputedStyle(this.el.nativeElement);
    mirror.style.position = 'absolute';
    mirror.style.top = '-9999px';
    mirror.style.left = '0';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.wordBreak = 'break-word';   
    mirror.classList.add('mirror-div');
  }

  private applyPassedParameter(mirror: HTMLDivElement) {
    mirror.style.fontSize = this.styles.fontSize || '16px';
    mirror.style.lineHeight = this.styles.lineHeight || '30px';
    mirror.style.padding = this.styles.padding || '0 12px';

    for (const [key, value] of Object.entries(this.styles)) {
      if (key !== 'fontSize' && key !== 'lineHeight' && key !== 'padding') {
        mirror.style.setProperty(key, value);
      }
    }

  }

  private initMirror() {
    if (!this.mirrorDiv) return;
    const mirror = this.mirrorDiv;
    this.applyDefaultStyle(mirror);
    this.applyPassedParameter(mirror);

    document.body.appendChild(mirror);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resize();
  }


  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  ngAfterViewInit() {

    this.mirrorDiv = document.createElement('div');
    this.initMirror();
    this.resize();

    setTimeout(() => {
      this.resize();
    });
  }

  private resize() {
    if (!this.mirrorDiv) return;
    const textarea = this.el.nativeElement;
    const mirror = this.mirrorDiv;

    // Sanitize and sync content
    let value = textarea.value;
    mirror.textContent = (textarea.value || '\u200B') + '\n';

    // Apply same width in case of resize
    mirror.style.width = window.getComputedStyle(textarea).width;

    const newHeight = mirror.offsetHeight;
    textarea.style.height = newHeight + 'px';
  }
}