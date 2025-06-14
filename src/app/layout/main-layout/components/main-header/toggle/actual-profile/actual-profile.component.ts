import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-actual-profile',
  imports: [ CommonModule ],
  templateUrl: './actual-profile.component.html',
  styleUrl: './actual-profile.component.scss'
})
export class ActualProfileComponent {

   @Output() closeOverlayEmitter = new EventEmitter<void>(); 

  @Input() currentUser: User | null = null;
  @Input() showOverlay = false;

  closeOverlay(){
      this.closeOverlayEmitter.emit();
  }

}