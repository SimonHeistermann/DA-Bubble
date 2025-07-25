import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { AutoResizeDirective } from '../../../../../core/directives/auto-resize.directive';
import { FormsModule } from '@angular/forms';
import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../../core/services/overlay.service';
import { EmojiPickerComponent } from '../emoji-picker/emoji-picker.component';
import { User } from '../../../../../core/models/user.interface';
import { UserListComponent } from '../user-list/user-list.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input',
  imports: [AutoResizeDirective, FormsModule, EmojiPickerComponent, UserListComponent, CommonModule],
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent{
  @Input() editingMode = false;
  inputMessage:string = '';
  @Input() placeHolder:string = '';
  allChannelUser: User[] = [];
  fullUserList: User[] = [];
  isTextareaFocused = false;
  originalMessage = '';

  @ViewChild('emojiPickerTemplate') emojiPickerTemplate!: TemplateRef<any>;
  @ViewChild('emojiPickerTrigger') emojiPickerTrigger!: ElementRef;
  @ViewChild('atUserListTempalte') atUserListTempalte!: TemplateRef<any>;
  @ViewChild('userListTrigger') atUserListTrigger!: ElementRef;
  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;

  emojiPickerOverlayRef!: OverlayRef;
  atUserListOverlayRef!: OverlayRef;
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);

  showUserListOverlay = false;
  mentionActive = false;
  mentionStartIndex: number | null = null;  

  @Input() set originalInputMessage(msg: string | undefined) {
    this.inputMessage = msg || '';
    this.originalMessage = msg || '';
  }

  @Input('allChannelUser') set allChannelUserInput(users: User[]) {
    this.allChannelUser = users;
    this.fullUserList = [...users];
  }

  @Output() sendMessageEmitter = new EventEmitter<string>();
  sendMessage() {
    let message = this.inputMessage.trim();
    if (message) {
      this.sendMessageEmitter.emit(message);
      this.inputMessage = '';
    }
  }

  @Output() breakEditingEmitter = new EventEmitter<void>();
  breakEditing() {
    this.breakEditingEmitter.emit();
    this.inputMessage = this.originalInputMessage || '';
  }

  @Output() saveEditingEmitter = new EventEmitter<string>();
  saveEditing() {
    let message = this.inputMessage.trim();
    if (message) {
      this.saveEditingEmitter.emit(message);
      this.inputMessage = '';
    }
  }

  typing() {
    const textarea = this.textareaRef.nativeElement;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;

    if (this.mentionActive && this.mentionStartIndex !== null) {
      if (cursorPos <= this.mentionStartIndex) {
        this.cancelMention();
        return;
      }

      const mentionText = text.slice(this.mentionStartIndex + 1, cursorPos);
      if (mentionText.includes(' ') || mentionText.includes('\n')) {
        this.cancelMention();
        return;
      }

      this.filterUserList(mentionText);
    }

    if (!this.mentionActive && text[cursorPos - 1] === '@') {
      this.mentionActive = true;
      this.mentionStartIndex = cursorPos - 1;
      this.showUserListOverlay = true;
    }
  }

  filterUserList(mentionText: string){
    this.allChannelUser = this.fullUserList.filter(u =>
      u.displayName.toLowerCase().startsWith(mentionText.toLowerCase())
    );
  }

  onTextareaKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
    
    if (event.key === 'Backspace' && this.mentionActive && this.mentionStartIndex !== null) {
      const cursorPos = this.textareaRef.nativeElement.selectionStart;
      if (cursorPos <= this.mentionStartIndex) {
        this.cancelMention();
      }
    }
  }

  cancelMention() {
    this.mentionActive = false;
    this.mentionStartIndex = null;
    this.showUserListOverlay = false;
    this.allChannelUser = [...this.fullUserList];
  }

  buildPosition(): ConnectedPosition[]  {
    return [{ originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' }]
  }

  showEmojiPicker() {
    this.emojiPickerOverlayRef = this.overlayService.openTemplateOverlay(
      this.emojiPickerTrigger, 
      this.emojiPickerTemplate, 
      this.viewContainerRef, 
      this.buildPosition(),
    );

    this.emojiPickerOverlayRef.backdropClick().subscribe(() => this.closeEmojiPickerOverlay());
  }

  showUserList(){
    const textarea = this.textareaRef.nativeElement;
    const cursorPos = textarea.selectionStart;
    const text = this.inputMessage;
    this.inputMessage = text.slice(0, cursorPos) + '@' + text.slice(cursorPos);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
    });

    this.mentionActive = true;
    this.mentionStartIndex = cursorPos;
    this.showUserListOverlay = true;
  }

  onClickUser(u: User) {
    if (this.mentionStartIndex === null) return;
    const textarea = this.textareaRef.nativeElement;
    const cursorPos = textarea.selectionStart;
    const beforeMention = this.inputMessage.slice(0, this.mentionStartIndex);
    const afterMention = this.inputMessage.slice(cursorPos);
    const mentionReplacement = `@${u.displayName} `;

    this.inputMessage = beforeMention + mentionReplacement + afterMention;

    setTimeout(() => {
      const newCursorPos = (beforeMention + mentionReplacement).length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });

    this.cancelMention(); 
  }

  closeUserListOverlay(){
    this.showUserListOverlay = false;
  }

  closeAtUserListOverlay(){
     this.atUserListOverlayRef?.dispose();
  }

  onSelectedEmoji(emojiStr: string){
    this.inputMessage += emojiStr;
    this.emojiPickerOverlayRef?.dispose();
  }

  closeEmojiPickerOverlay(){
    this.emojiPickerOverlayRef?.dispose();
  }
}
