import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Message } from '../../../../../../core/models/message.interface';
import { InputComponent } from '../../../shared/input/input.component';
import { User } from '../../../../../../core/models/user.interface';

@Component({
  selector: 'app-message-content',
  imports: [InputComponent],
  standalone: true,
  templateUrl: './message-content.component.html',
  styleUrl: './message-content.component.scss'
})
export class MessageContentComponent implements OnChanges {
  @Input() message: Message | null = null;
  @Input() isEditing = false;
  @Input() allUsersWithOutCurrentUser: User[] = [];
  @Input() currentUserId: any = '';
  @Input() messageUserID: any = '';

  @Output() breakEditingEmitter = new EventEmitter<void>();
  @Output() saveEditingEmitter = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['isEditing'] && changes['isEditing'].currentValue) {
      this.isEditing = changes['isEditing'].currentValue;
    }
    
  }

  onBreakEditing() {
    this.breakEditingEmitter.emit();
  }

  onSaveEditing(msg: string) {
    this.saveEditingEmitter.emit(msg);
    this.isEditing = false;
  }
}
