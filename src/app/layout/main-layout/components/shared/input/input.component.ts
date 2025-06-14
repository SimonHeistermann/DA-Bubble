import { Component } from '@angular/core';
import { AutoResizeDirective } from '../../../../../core/directives/auto-resize.directive';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [AutoResizeDirective, FormsModule],
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {
  inputMessage = '';
  isTextareaFocused = false;

  // @Output sendMessageEmitter = new Event();
  sendMessage() {

  }
}
