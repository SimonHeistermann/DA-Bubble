import { Component, ElementRef, EventEmitter, inject, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../../../core/services/channel.service';
import { expandCollapseAnimation } from '../../animations/expand-collapse.animation';
import { RichtextEditorComponent } from '../shared/richtext-editor/richtext-editor.component';
import { UserListComponent } from '../shared/user-list/user-list.component';
import { User } from '../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';


@Component({
  selector: 'app-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, RichtextEditorComponent, UserListComponent],
  templateUrl: './add-channel.component.html',
  styleUrl: './add-channel.component.scss',
  animations: [expandCollapseAnimation]
})
export class AddChannelComponent implements OnDestroy {
  filteredUsers: User[] = [];
  allUsers: User[] = [];

  currentUser: User | null = null;
  private subscriptions = new Subscription();
  authService = inject(AuthService);
  userService = inject(UserService);
  channelService = inject(ChannelService);
  tagIDs: string[] = [];

  @Output() closeOverlay = new EventEmitter<void>();
  editorEl!: HTMLDivElement;
  @ViewChild("richtextEditor") richtextEditorRef!: RichtextEditorComponent;
  showChannelNameError = false;
  showAddUserContent = true;
  firstCbActivated = true;
  showActiveButtonInAddUser = false;
  showChooseNameInput = false;
  showUserList = false;
  errMsg = '';
  channelName: string = '';

  ngOnInit() {
    
    this.subCurrentUser();
    this.subAllUsers();
  }

  subCurrentUser(){
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
        console.log(this.currentUser);
        
      })
    );
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
        console.log('alluser: ', this.allUsers);
      }));

    
  }
  

  clickClose() {
    this.closeOverlay.emit();
  }

  clickCreateChannel() {
    this.channelService.getChannels((data) => {
      const index = data.findIndex(e => e.name.toLowerCase() == this.channelName.toLowerCase());
      if (index !== -1) {
        this.errMsg = 'Der Channelname existiert schon';
        this.showChannelNameError = true;
      } else {
        this.showAddUsersOverlay();
      }
    })
  }

  clickAddSomeUsers() {
    this.firstCbActivated = false;
    this.showChooseNameInput = true;
  }

  showAddUsersOverlay() {
    this.showAddUserContent = true;
  }

  inputUserName() {

  }

  onEditorReady(el: HTMLDivElement) {
    this.editorEl = el;
  }

  onEditorValueChanged(html: string) {
    if(html.trim().length > 0) {
      
      
      this.filteredUsers = this.allUsers.filter(u => u.displayName.toLowerCase().includes(html.toLowerCase()));
      for (let index = 0; index < this.filteredUsers.length; index++) {
        const u = this.filteredUsers[index];
        const i = this.tagIDs.findIndex(tagID => tagID == u.uid);
        if (i !== -1) {
          this.filteredUsers.splice(index, 1);
          index --;
        }
      }
      this.showUserList = true;
    } else {
      this.showUserList = false;
    }
  }

  onHasTag(b: boolean) {
    this.showActiveButtonInAddUser = b;
  }

  onTagIDsChanges(arr: string[]) {
    this.tagIDs = arr;
  }

  onClickedUser(u: User) {
    this.richtextEditorRef.insertTag(u);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
