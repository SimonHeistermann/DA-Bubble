import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-intro-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro-animation.component.html',
  styleUrl: './intro-animation.component.scss'
})
export class IntroAnimationComponent {
  @Output() animationComplete = new EventEmitter<void>();
  
  logoMoveLeft = false;
  showBrandText = false;
  moveToHeaderPosition = false;
  fadeBackground = false;
  isHidden = false;

  ngOnInit() {
    this.startAnimation();
  }

  private startAnimation() {
    setTimeout(() => {
      this.logoMoveLeft = true;
    }, 1000);
    setTimeout(() => {
      this.showBrandText = true;
    }, 1300);
    setTimeout(() => {
      this.moveToHeaderPosition = true;
      this.fadeBackground = true;
    }, 2050);
    setTimeout(() => {
      this.isHidden = true;
      this.animationComplete.emit();
    }, 3200);
  }
}