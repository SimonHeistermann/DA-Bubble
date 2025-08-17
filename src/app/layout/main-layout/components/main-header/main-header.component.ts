import { Component, inject, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { concat } from 'rxjs';
import { User } from '../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { DashboardResponsiveService } from '../../../../core/services/dashboard-responsive/dashboard-responsive.service'
import { ToggleComponent } from "./toggle/toggle.component";
import { MainLayoutContentComponent } from '../../main-layout-content/main-layout-content.component';
import { Dialog} from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { Channel } from '../../../../core/models/channel.interface';
import { FormsModule } from '@angular/forms';
import { Message } from '../../../../core/models/message.interface';
import { MessageService } from '../../../../core/services/message.service';
import { ChannelService } from '../../../../core/services/channel.service';
import { ThreadService } from '../../../../core/services/thread-service/thread.service';
import { DateService } from '../../../../core/services/date.service';
import { UserChannelActivityService } from '../../../../core/services/userReadActivity.service';
import { CommunicatorService } from '../message/search-message-header/search-message-header.component';



@Component({
  selector: 'app-main-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.scss'
})
export class MainHeaderComponent implements OnDestroy {

  @Input() allChannelUsers: User[] = [];

  router = inject(Router);

  currentUser: User | null = null;
  private subscriptions = new Subscription();
  showProfileOverlay = false;
  currentUserIndex = -1;
  selectedUser: User | null = null;
  authService = inject(AuthService);
  userService = inject(UserService);
  channelService = inject(ChannelService);
  messageService = inject(MessageService);
  dateService = inject(DateService)
  threadService = inject(ThreadService);
  userChannelActivityService = inject(UserChannelActivityService);
  communicator = inject(CommunicatorService);
  dialog = inject(Dialog);
  mainLayoutContentComponent = inject(MainLayoutContentComponent);

  normalScreen = false;
  isMobile = false;
  isTablet = false;

  inputContent: string = ''
  showList = false;
  allUsers: User[]  = [];
  allChannel: Channel[]  = [];
  channels : Channel[] = [];
  allChannelMessages: Message[] = [];
  allPrivateMessages: Message[] = [];
  filteredUsers: User[] = [];
  filteredChannels: Channel[] = [];
  filteredPrivateMessages: Message[] = []
  filteredChannelMessages: Message[] = []


  public currentChannelIndex: number = 0;

  @Output() clickChannelNameEmitter = new EventEmitter<Channel>();

  constructor(public dashboardResponsive: DashboardResponsiveService) {
     this.dashboardResponsive.normalScreen$.subscribe(normalScreen => {
      this.normalScreen = normalScreen;
      console.log(this.normalScreen);
    })

     this.dashboardResponsive.isTablet$.subscribe(isTablet => {
      this.isTablet = isTablet;
    })
    this.dashboardResponsive.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
    })

  }

  ngOnInit() {
    this.subCurrentUser();
  }

  clickUser(user: User){
    this.clearFilter();
    this.communicator.sendUserMessage(user);
    if(user && this.currentUser) {
      this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser?.id, user.id);
    } 
    this.router.navigate(['/dashboard', 'users', user.id]);
  }

  clickChannel(channel: Channel) {
    this.clearFilter();
    this.communicator.sendChannelMessage(channel);
    
    if (this.currentUser) {
       this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser?.id, channel.id);
    }
    this.router.navigate(['/dashboard', 'channels', channel.id]);
  }

  clearFilter() {
    this.filteredChannelMessages = [];
    this.filteredPrivateMessages = [];
    this.filteredUsers = [];
    this.filteredChannels = [];
    this.showList = false;
    this.inputContent = ''
  }

  inputText() { 
    const value = this.inputContent.trim();

    if (!value) {
      this.filteredChannelMessages = [];
      this.filteredPrivateMessages = [];
      this.filteredUsers = [];
      this.filteredChannels = [];
      this.showList = false;
      return;
    }
    this.showList = true;
    if (value.startsWith('@')) {
      this.filterUsers(value);
    } else if (value.startsWith('#')) {
      this.filterChannel(value);
    } else {
      this.filterByAll(value);
    }
  }

  activateSearch() {
    this.threadService.hide();
  }


  filterUsers(value: string) {
    this.filteredChannels = [];
    this.filteredChannelMessages = [];
    this.filteredPrivateMessages = [];

    if (value == '@') {
      this.filteredUsers = this.allUsers;
    } else {
      const search = value.slice(1).toLowerCase(); 
      this.filteredUsers = this.allUsers?.filter(user =>
        user.displayName.toLowerCase().includes(search)
      ) || [];
    }
  }

  filterChannel(value: string) {
    this.filteredUsers = [];
    this.filteredChannelMessages = [];
    this.filteredPrivateMessages = [];

    const search = value.slice(1).toLowerCase(); 

    this.filteredChannels = this.allChannel?.filter(channel =>
      channel.name.toLowerCase().includes(search)
    ) || [];
  }

  filterByAll(value: string) { 
    this.filteredChannels = [];
    this.filteredUsers = [];
    this.filteredChannelMessages = []
    this.filteredPrivateMessages = []

    this.filteredUsers = this.allUsers?.filter(user =>
      user.email.toLowerCase().includes(value)
    ) || [];

    this.filteredChannels = this.channels?.filter(channel =>
      channel.name.toLowerCase().includes(value)
    ) || [];

    this.filterPrivateMessage(value);
    this.filterChannelMessage(value);
    
  }

  filterPrivateMessage(value: string) {
    this.filteredPrivateMessages = this.allPrivateMessages?.filter(message =>
      message.content.toLowerCase().includes(value)
    ) || [];
  }

  filterChannelMessage(value: string) {
     this.filteredChannelMessages = this.allChannelMessages?.filter(message =>
      message.content.toLowerCase().includes(value)
    ) || [];
  }

  subCurrentUser() {
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
          this.subAllUsers();
      })
    );
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
        this.allUsers = this.allUsers.filter(u => u.id !== this.currentUser?.id);

        this.subAllChannels();
        
      }));
  }

  subAllChannels() {
    if(!this.currentUser) return;
    this.subscriptions.add(
      this.channelService.getChannels((data) => {
        this.channels = [...data];
        this.subAllChannelMessages()
        this.subAllPrivateMessages()
        if (this.channels.length > 0) {
          this.clickChannelNameEmitter.emit(this.channels[this.currentChannelIndex]);
        }
      })
    );
  }

  subAllChannelMessages() {
    if(!this.currentUser) return;
    for (let index = 0; index < this.allChannel.length; index++) {
      let c = this.allChannel[index]
      this.subscriptions.add(
        this.messageService.getChannelMessageOrderByCreatedAt(c.id, (data) => {
          this.allChannelMessages = this.allChannelMessages.concat([...data])
        })
      );
    }
  }

  subAllPrivateMessages() {
    if(!this.currentUser) return;
    for (let index = 0; index < this.allUsers.length; index++) {
      const user = this.allUsers[index];
      const userID = user.id;
      this.subscriptions.add(
        this.messageService.getPrivateMessageOrderByCreatedAt(this.messageService.buildConversationID(this.currentUser.id, userID), (data) => {
          this.allPrivateMessages = this.allPrivateMessages.concat([...data])
      }));
      
    }
  }

  findUserNameByID(id: string) {
    const user = this.allUsers?.find(u => id == u.id);
    if (user) {
      return user.displayName;
    } else {
      if(id == this.currentUser?.id) {
        return this.currentUser.displayName;
      } else {
        return '';
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  showProfile( user: User) {
  const dialogRef = this.dialog.open<{action: string}>(ToggleComponent, {
    data: { user },
    panelClass: 'profile-dialog',
  });
  
   dialogRef.closed.subscribe(result => {
    if (result?.action === 'logout') {
      this.closeProfile();
    }
  })
    this.showProfileOverlay = true;
  }

  navigateToMain(){
    this.dashboardResponsive.setOpenSidebar(true);
  }

  closeProfile() {
    this.showProfileOverlay = false;
    this.dialog.closeAll();
  }


}
