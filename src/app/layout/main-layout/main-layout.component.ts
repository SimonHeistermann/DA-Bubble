import { Component, ElementRef, ViewChild } from '@angular/core';
import { MainHeaderComponent } from './components/main-header/main-header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  imports: [MainHeaderComponent, CommonModule ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {

  menuOpen = false;
  
  @ViewChild('overlay') overlay!: ElementRef;
  @ViewChild('main') main!: ElementRef;
  @ViewChild('devSpace') devSpace!: ElementRef;

  toggleMenu(){
    if (!this.menuOpen) {
      console.log(`Opening menu` + this.menuOpen);
      this.overlay.nativeElement.classList.add('show-menu');
      this.overlay.nativeElement.classList.remove('hide-menu'); 
      this.main.nativeElement.classList.add('shrink-menu');
      this.devSpace.nativeElement.classList.remove('d__none');
      this.menuOpen = true;
    } else {
      console.log(`Closing menu` + this.menuOpen);
      this.overlay.nativeElement.classList.remove('show-menu');
      this.overlay.nativeElement.classList.add('hide-menu'); 
      this.main.nativeElement.classList.remove('shrink-menu');
      this.devSpace.nativeElement.classList.add('d__none');
      this.menuOpen = false;
    }

  }

}
