import { Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../../../core/services/channel.service';
import { verticalExpandCollapseAnimation } from '../../animations/expand-collapse.animation';
import { RichtextEditorComponent } from '../shared/richtext-editor/richtext-editor.component';
import { UserListComponent } from '../shared/user-list/user-list.component';
import { User } from '../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { Channel, ChannelData } from '../../../../core/models/channel.interface';
import { AutoResizeDirective } from '../../../../core/directives/auto-resize.directive';


@Component({
  selector: 'app-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, RichtextEditorComponent, UserListComponent, AutoResizeDirective],
  templateUrl: './add-channel.component.html',
  styleUrl: './add-channel.component.scss',
  animations: [verticalExpandCollapseAnimation]
})
export class AddChannelComponent implements OnDestroy, OnChanges {
  filteredUsers: User[] = [];
  allUsers: User[] = [];

  currentUser: User | null = null;
  private subscriptions = new Subscription();
  authService = inject(AuthService);
  userService = inject(UserService);
  channelService = inject(ChannelService);
  tagIDs: string[] = [];

  
  @Output() closeOverlayEmitter = new EventEmitter<void>();
  editorEl!: HTMLDivElement;
  @ViewChild("richtextEditor") richtextEditorRef!: RichtextEditorComponent;

  @Input() showOverlay = false;

  showChannelNameError = false;
  showAddUserContent = false;
  firstCbActivated = true;
  showActiveButtonInAddUser = false;
  showChooseNameInput = false;
  editorOverflowStyle = 'hidden';
  showUserList = false;
  errMsg = '';
  
  channel:Partial<ChannelData> = {
    name: 'New Channel',
    description: '',
    createdBy: '',
    userIDs: []
  };



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
        this.channel.createdBy = this.currentUser?.id;
      })
    );
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
      }));
  }
  
  clickCreateChannel() {
    this.subscriptions.add(
      this.channelService.getChannels((data) => {
        const index = data.findIndex(e => e.name.toLowerCase() == this.channel.name?.toLowerCase());
        if (index !== -1) {
          this.errMsg = 'Der Channelname existiert schon';
          this.showChannelNameError = true;
        } else {
          this.showAddUsersOverlay();
        }
      })
    );
  }

  addOneChannelToDB() {
    this.subscriptions.add(
      this.channelService.addOneChannel(this.channel).subscribe({
        next: (id: string) => {
          console.log('Channel added with ID:', id);
        },
        error: (e) => {
          
        },
        complete: () => {
          console.log('Add channel operation completed.');
          this.closeOverlayEmitter.emit();
        }
      })
    )
  }

  fetchUserIDsFromAllgemeinAndAddChannel() {
    this.subscriptions.add(
      this.channelService.getChannelByName('Allgemein', (data) => {
        const channels: Channel[] = [...data];
        const firstChannel = channels[0];
        this.channel.userIDs?.push(...(firstChannel.userIDs || []));
        this.addOneChannelToDB();
      })
    );
  }

  clickCreateChannelInAddUser(){
    if(this.firstCbActivated) {
        this.fetchUserIDsFromAllgemeinAndAddChannel();
    } else {
      if(typeof this.currentUser?.id === 'string') {
        this.channel.userIDs?.push(this.currentUser.id);
        this.channel.userIDs?.push(...this.tagIDs);
      } else {
        console.log('current user not found');
        return;
      }
      this.addOneChannelToDB();
    }
  }

  clickAddAllUserFromAllgemin() {
    this.firstCbActivated = true; 
    this.showChooseNameInput = false;
    this.editorOverflowStyle = 'hidden';
    this.filteredUsers = [];
    this.showUserList = false;

  }

  clickAddSomeUsers() {
    this.firstCbActivated = false;
    this.showChooseNameInput = true;
    this.editorOverflowStyle = 'visible';
  }

  showAddUsersOverlay() {
    this.showAddUserContent = true;
  }

  filterOutCurrentUser() {
    const i = this.filteredUsers.findIndex(u => u.id === (this.currentUser?.id || '') );
    if (i !== -1) this.filteredUsers.splice(i, 1);
  }

  filterOutChosenUser() {
    this.filterOutCurrentUser();

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
      this.filterOutChosenUser();

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

  ngOnChanges(changes: SimpleChanges): void {
    // if (changes['showOverlay'])
  }

  closeOverlay() {
    this.showOverlay = false;
    this.closeOverlayEmitter.emit();
  }


  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
