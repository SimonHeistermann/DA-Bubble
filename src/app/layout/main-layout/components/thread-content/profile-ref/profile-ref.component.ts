import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-ref',
  imports: [ CommonModule ],
  templateUrl: './profile-ref.component.html',
  styleUrl: './profile-ref.component.scss'
})
export class ProfileRefComponent {

   @Output() closeOverlayEmitter = new EventEmitter<void>(); 

  @Input() currentUser: User | null = null;
  @Input() showOverlay = false;

  closeOverlay(){
      this.closeOverlayEmitter.emit();
  }


}
