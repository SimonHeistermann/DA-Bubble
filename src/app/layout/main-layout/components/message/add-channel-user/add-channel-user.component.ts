import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../../../../core/services/channel.service';
import { verticalExpandCollapseAnimation } from '../../../animations/expand-collapse.animation';
import { RichtextEditorComponent } from '../../shared/richtext-editor/richtext-editor.component';
import { UserListComponent } from '../../shared/user-list/user-list.component';
import { User } from '../../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { Channel, ChannelData } from '../../../../../core/models/channel.interface';
import { slideFadeInAnimation } from '../../../animations/slide.animation';


@Component({
  selector: 'app-add-channel-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RichtextEditorComponent, UserListComponent],
  templateUrl: './add-channel-user.component.html',
  styleUrl: './add-channel-user.component.scss',
  animations: [verticalExpandCollapseAnimation, slideFadeInAnimation]
})
export class AddChannelUserComponent implements OnDestroy {
  filteredUsers: User[] = [];
  allUsers: User[] = [];

  @Input() currentUser: User | null = null;
  @Input() allChannelUsers: User[] = [];
  @Input() currentChannel: Channel | null = null;

  private subscriptions = new Subscription();
  authService = inject(AuthService);
  userService = inject(UserService);
  channelService = inject(ChannelService);
  tagIDs: string[] = [];

  @Output() closeOverlayEmitter = new EventEmitter<void>();
  editorEl!: HTMLDivElement;
  @ViewChild("richtextEditor") richtextEditorRef!: RichtextEditorComponent;

  showActiveButtonInAddUser = false;
  editorOverflowStyle = 'hidden';

  showUserList = false;
 

  ngOnInit() {
    this.subAllUsers();
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
        console.log('alluser: ', this.allUsers);
      }));
  }
  
  filterOutExitedUsers() {
    this.filteredUsers = this.filteredUsers.filter(u => u.id !== this.currentUser?.id);
    for (let index = 0; index < this.filteredUsers.length; index++) {
      const u = this.filteredUsers[index];
      const i = this.allChannelUsers.findIndex(existedUser => existedUser.id === u.id);
      if (i !== -1) {
        this.filteredUsers.splice(index, 1);
        index --;
      }
    }
  }

  filterOutChosenUsers() {
    for (let index = 0; index < this.filteredUsers.length; index++) {
      const u = this.filteredUsers[index];
      const i = this.tagIDs.findIndex(tagID => tagID === u.id);
      if (i !== -1) {
        this.filteredUsers.splice(index, 1);
        index --;
      }
    }
  }

  onEditorReady(el: HTMLDivElement) {
    this.editorEl = el;
  }

  onEditorValueChanged(html: string) {
    if(html.trim().length > 0) {
      this.filteredUsers = this.allUsers.filter(u => u.displayName.toLowerCase().includes(html.toLowerCase()));
      this.filterOutChosenUsers();
      this.filterOutExitedUsers();

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

  clickAddChannelUser() {
    if (this.currentChannel && this.tagIDs.length > 0) {
      this.currentChannel.userIDs?.push(...this.tagIDs);
      let {id, ...channelData} = this.currentChannel;
      // let channelData = ;
      this.subscriptions.add( 
        this.channelService.updateChannel(this.currentChannel?.id, channelData).subscribe({
          next: () => {
            console.log('Channel members updated');
            
          },
          error: (e)=> {

          },
          complete: () => {
            this.closeOverlayEmitter.emit();
          }
        })
      );
    }
   
  }

  closeOverlay() {
    this.closeOverlayEmitter.emit();
  }


  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
