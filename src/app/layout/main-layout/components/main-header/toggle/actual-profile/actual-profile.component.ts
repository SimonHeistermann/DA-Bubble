import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { User } from '../../../../../../core/models/user.interface';
import { DataService } from '../../../../../../core/services/data-service/data.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-actual-profile',
  imports: [CommonModule],
  templateUrl: './actual-profile.component.html',
  styleUrl: './actual-profile.component.scss'
})
export class ActualProfileComponent {

  @Output() closeOverlayEmitter = new EventEmitter<void>();

  @Input() currentUser: User | null = null;
  @Input() showOverlay = false;

  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  dataService = inject(DataService);

  editMode = false;

  editProfile() {
    this.editMode = true;
    console.log(`Is Editing`, this.editMode);

  }

  saveProfile() {
    this.editMode = false;
    if (this.nameInput) {
      const enteredName = this.nameInput.nativeElement.value.trim();
      if (enteredName.split(/\s/).length < 2) {
        this.currentUser!.profile.firstName = enteredName;
        this.currentUser!.displayName = enteredName + ' ' + this.currentUser!.profile.lastName;
      } else {
        this.currentUser!.profile.firstName = enteredName.split(/\s/)[0];
        this.currentUser!.profile.lastName = enteredName.split(/\s/)[1];
        this.currentUser!.displayName = enteredName;
      }
      this.updateUser();
    }
  }

  updateUser() {
    this.dataService.updateDocument('users', this.currentUser!.id, {
      displayName: this.currentUser!.displayName,
      profile: {
        firstName: this.currentUser!.profile.firstName,
        lastName: this.currentUser!.profile.lastName
      }
    });
  }

  closeOverlay() {
    this.closeOverlayEmitter.emit();
  }


}