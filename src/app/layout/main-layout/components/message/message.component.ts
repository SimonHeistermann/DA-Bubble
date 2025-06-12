import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { InputComponent } from '../shared/input/input.component';
import { CommonModule } from '@angular/common';
import { Channel } from '../../../../core/models/channel.interface';
import { Subscription } from 'rxjs';
import { UserService } from '../../../../core/services/user-service/user.service';
import { forkJoin, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { User } from '../../../../core/models/user.interface';
import { AddChannelUserComponent } from './add-channel-user/add-channel-user.component';
import {
  ElementRef,
  ViewChild,
  ViewContainerRef,
  TemplateRef,
} from '@angular/core';
import {
  OverlayRef,
} from '@angular/cdk/overlay';
import { OverlayService } from '../../../../core/services/overlay.service';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { ChannelUserListComponent } from './channel-user-list/channel-user-list.component';
import { EditChannelComponent } from './edit-channel/edit-channel.component';
import { MessageBoxComponent } from './message-box/message-box.component';

@Component({
  selector: 'app-message',
  imports: [InputComponent, CommonModule, AddChannelUserComponent, ChannelUserListComponent, EditChannelComponent, MessageBoxComponent],
  standalone: true,
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
  animations: [],
})
export class MessageComponent implements OnInit, OnChanges, AfterViewInit{
  @ViewChild('addMember') addMemberRef!: ElementRef;
  @ViewChild(AddChannelUserComponent) addChannelUserComp!: AddChannelUserComponent;

  @ViewChild('userList') userListRef!: ElementRef;
  @ViewChild(ChannelUserListComponent) channelUserListComp!: ChannelUserListComponent;
  

  @ViewChild('editChannelTemplate') editChannelTemplate!: TemplateRef<any>;
  @ViewChild('editChannel') editChannelRef!: ElementRef;

  userListOverlayRef!: OverlayRef;
  editChannelOverlayRef!: OverlayRef;
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);

  @Input() channel: Channel | null = null;

  @Output() leaveChannelEmitter = new EventEmitter<void>();

  private subscriptions = new Subscription();
  showHeader: 'direct' | 'channel' | 'new' = 'channel';
  activeAddChannelUserButton = false;
  activeUserListButton = false;
  activeEditChannelButton = false;
  
  userService = inject(UserService);
  allUsers: User[] = [];
  authService = inject(AuthService);
  currentUser: User | null = null;

  showAddChannelUserOverlay = false;
  showUserListOverlay = false;

  ngOnInit(): void {
    this.subCurrentUser();
  }

  ngAfterViewInit(): void {
    
    this.addChannelUserComp.addMemberRef = this.addMemberRef;
    this.channelUserListComp.userListRef = this.userListRef;
  }

  subCurrentUser(){
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
        if (this.allUsers.length) {
          this.filterOutCurrentUser();
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      this.onChannelChanged(changes['channel'].currentValue);
    }
    console.log('changes in message', changes);
    
  }

  onChannelChanged(channel: Channel) {
    this.channel = channel;
    const userIDs = this.channel.userIDs ?? [];
    if(this.channel.userIDs?.length === 0) return;

    this.subscriptions.add(
      forkJoin(userIDs.map(uid => this.userService.getUserById(uid)))
      .subscribe( users => {
        this.allUsers = [];
        this.allUsers = users.filter((u): u is User => u !== null);
        if (this.currentUser) {
          this.filterOutCurrentUser();
        }
     })
    )
  }

  filterOutCurrentUser() {
    this.allUsers = this.allUsers.filter(u => u.id !== this.currentUser?.id);
    console.log(this.allUsers);
    
  }
 

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  


  openEditChannelOverlay(){
    this.activeEditChannelButton = true;
    let positions = this.overlayService.defaultPositions;
    positions[0] = { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' };
    
    this.editChannelOverlayRef = this.overlayService.openTemplateOverlay(
      this.editChannelRef, 
      this.editChannelTemplate, 
      this.viewContainerRef, 
    );

    this.editChannelOverlayRef.backdropClick().subscribe(() => this.closeEditChannelOverlay());
  }

  closeEditChannelOverlay() {
      this.activeEditChannelButton = false;
      this.editChannelOverlayRef?.dispose();
  }

  onAddMemberFromChannelUserList() {
    this.userListOverlayRef?.dispose();
    this.showAddChannelUserOverlay = true;
  }

  openUserListOverlay() {
    this.showUserListOverlay = true;
    this.activeUserListButton = true;
  }

  closeUserListOverlay() {
    this.showUserListOverlay = false;
    this.activeUserListButton = false;
  }

  openAddChannelUserOverlay() {
    this.showAddChannelUserOverlay = true;
    this.activeAddChannelUserButton = true;
  }

  closeAddChannelUserOverlay() {
    this.showUserListOverlay = false;
    this.showAddChannelUserOverlay = false;
    this.activeAddChannelUserButton = false;
  }

  closeEditChannelOverlayByLeavingChannel(isLeaving: boolean) {
    this.activeEditChannelButton = false;
    this.editChannelOverlayRef?.dispose();
 
    if(isLeaving) this.leaveChannelEmitter.emit();
  }
}
