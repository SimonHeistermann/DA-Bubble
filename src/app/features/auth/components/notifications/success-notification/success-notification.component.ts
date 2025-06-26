import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-success-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './success-notification.component.html',
  styleUrl: './success-notification.component.scss'
})
export class SuccessNotificationComponent {
  @Input() show: boolean | null = false;
  @Input() message: string | null = 'Aktion erfolgreich.';
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
