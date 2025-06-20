
import { AfterViewInit, Component, ElementRef, Inject, inject, InjectionToken, Injector, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MainHeaderComponent } from './../components/main-header/main-header.component';
import { CommonModule } from '@angular/common';
import { AddChannelComponent } from './../components/add-channel/add-channel.component';
import { Channel, CHANNEL_TOKEN } from '../../../core/models/channel.interface';
import { SidebarComponent } from './../components/sidebar/sidebar.component';
import { MessageComponent } from './../components/message/message.component';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { ThreadContentComponent } from "../components/thread-content/thread-content.component";
import { OverlayService } from '../../../core/services/overlay.service';
import { ThreadService } from '../../../core/services/thread-service/thread.service';
import { User } from '../../../core/models/user.interface';
import { AuthService } from '../../../core/services/auth-service/auth.service';
import { UserService } from '../../../core/services/user-service/user.service';
import { Subscription } from 'rxjs';
import { ChannelService } from '../../../core/services/channel.service';

@Component({
  selector: 'app-main-layout-content',
  imports: [MainHeaderComponent, CommonModule, AddChannelComponent, SidebarComponent, RouterOutlet, ThreadContentComponent],
  templateUrl: './main-layout-content.component.html',
  styleUrl: './main-layout-content.component.scss',
  animations: []
})
export class MainLayoutContentComponent implements AfterViewInit, OnInit {
  @ViewChild('sidebar') sidebarRef!: SidebarComponent;

  private subscriptions = new Subscription();
  route = inject(ActivatedRoute);
  threadService = inject(ThreadService);
  authService = inject(AuthService);
  userService = inject(UserService);
  channelService = inject(ChannelService);

  showSidebar = true;
  showAddChannelOverlay = false;
  clickedChannel: Channel | null = null;
  firstUnreadMessageId: string = '';

  currentUser: User | null = null;
  allChannels: Channel[] = []


  ngOnInit() { 
  }

  ngAfterViewInit(): void {
    this.route.paramMap.subscribe(params => {
      const channelId = params.get('channelId');
      if (channelId) {
        this.handleChannelChange(channelId);
      }
    });
  }

  subCurrentUser(){
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.subAllChannels();
      })
    );
  }

  subAllChannels() {
    if(!this.currentUser) return;
    
    this.subscriptions.add(
      this.channelService.getChannelsOrderByCreatedAt(this.currentUser.id, (data) => {
        this.allChannels = [...data];
        this.clickedChannel = this.allChannels[0];
      })
    );
  }

  handleChannelChange(channelId: string) {
    const sidebarRef = this.sidebarRef;
    const index = sidebarRef.channels.findIndex(c => c.id === channelId);

    if (index !== -1) {
      this.sidebarRef.currentChannelIndex = index;
      this.clickedChannel = this.sidebarRef.channels[index];
    }
  }

  toggleMenu() {
    this.showSidebar = !this.showSidebar;
  }

  onAddChannel() {
    this.showAddChannelOverlay = true;
  }

  onClickChannelName(c: Channel) {
    this.clickedChannel = c;
  }

  onLeaveChannel() {
    this.sidebarRef.clickChannelName(0, this.sidebarRef.channels[0]);
  }
}

