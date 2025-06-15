import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { AddChannelUserComponent } from './add-channel-user/add-channel-user.component';
import { ChannelUserListComponent } from './channel-user-list/channel-user-list.component';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { AuthService } from '../../../../../core/services/auth-service/auth.service';
import { User } from '../../../../../core/models/user.interface';
import { OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../../core/services/overlay.service';
import { Channel } from '../../../../../core/models/channel.interface';
import { EditChannelComponent } from './edit-channel/edit-channel.component';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-channel-message-header',
  imports: [AddChannelUserComponent, ChannelUserListComponent, EditChannelComponent],
  templateUrl: './channel-message-header.component.html',
  styleUrl: './channel-message-header.component.scss'
})
export class ChannelMessageHeaderComponent implements AfterViewInit, OnInit {
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
  @Output() leaveChannelEmitter = new EventEmitter<void>();

  @Input() channel: Channel | null = null;
  
  activeAddChannelUserButton = false;
  activeUserListButton = false;
  activeEditChannelButton = false;

  showAddChannelUserOverlay = false;
  showUserListOverlay = false;

  private subscriptions = new Subscription();
  userService = inject(UserService);
  allUsers: User[] = [];
  authService = inject(AuthService);
  currentUser: User | null = null;

  ngOnInit() {
    this.subCurrentUser();
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
  }


  ngAfterViewInit(): void {
    this.addChannelUserComp.addMemberRef = this.addMemberRef;
    this.channelUserListComp.userListRef = this.userListRef;

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
