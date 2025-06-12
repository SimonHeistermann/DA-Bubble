import { Component } from '@angular/core';
import { AutoResizeDirective } from '../../../../../core/directives/auto-resize.directive';

@Component({
  selector: 'app-input',
  imports: [AutoResizeDirective],
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {
  isTextareaFocused = false;
}
