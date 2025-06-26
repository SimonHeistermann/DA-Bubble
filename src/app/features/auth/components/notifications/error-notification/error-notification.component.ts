import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-error-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-notification.component.html',
  styleUrl: './error-notification.component.scss'
})
export class ErrorNotificationComponent {
  @Input() show: boolean | null = false;
  @Input() message: string | null = 'Ein Fehler ist aufgetreten.';
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
