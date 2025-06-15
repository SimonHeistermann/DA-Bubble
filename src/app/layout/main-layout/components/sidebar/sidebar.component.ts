import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelService } from '../../../../core/services/channel.service';
import { Channel } from '../../../../core/models/channel.interface';
import { toggleMarginRight20Animation, toggleMarginTop25Animation } from '../../animations/expand-collapse.animation';
import { User } from '../../../../core/models/user.interface';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SimplebarAngularModule } from 'simplebar-angular';
import { CommonModule } from '@angular/common';
import { MessageService } from '../../../../core/services/message.service';

@Component({
  selector: 'app-sidebar',
  imports: [SimplebarAngularModule, CommonModule],
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  animations: [toggleMarginTop25Animation, toggleMarginRight20Animation],

})
export class SidebarComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  channelService = inject(ChannelService);
  authService = inject(AuthService);
  userService = inject(UserService);
  messageService = inject(MessageService)
  route = inject(ActivatedRoute);
  channels: Channel[] = [];
  allUsers: User[] = [];
  currentUser: User | null = null;
  imgLoadStatus: Record<string, boolean> = {};
  isOverflowing = false;

  @Input() showSelf: boolean = true;
  @Output() addChannel = new EventEmitter<void>();
  @Output() clickChannelNameEmitter = new EventEmitter<Channel>();

  openChannel = true;
  openMessage = true;

  public currentChannelIndex: number = 0;
  router = inject(Router);

  ngOnInit(): void {
    this.subCurrentUser();
    this.subMessagesInAllChannel();
  }

  subMessagesInAllChannel() {
    for (let index = 0; index < this.channels.length; index++) {
      const channel = this.channels[index];
      this.subscriptions.add(
      this.messageService.getChannelMessageOrderByCreatedAt(channel.id, (data) => {
       
        // this.messages.push(...data);
        
        // if (this.messages.length > 0) {
        //   console.log('messaged updatged', this.messages);
        //   this.markChannelAsSeen();
        // }
      })
    );
    }
    
  }

  subCurrentUser(){
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
        console.log('sidebar-currentuser:', this.currentUser);
        
        this.subAllUsers();
        this.subAllChannels();
      })
    );
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
        this.allUsers = this.allUsers.filter(u => u.id !== this.currentUser?.id);
      }));
  }

  subAllChannels() {
    if(!this.currentUser) return;
    
    this.subscriptions.add(
      this.channelService.getChannelsOrderByCreatedAt(this.currentUser.id, (data) => {
        
        this.channels = [...data];
        
        if (this.channels.length > 0) {
          console.log(this.channels);
          
          this.clickChannelNameEmitter.emit(this.channels[this.currentChannelIndex]);
        }
      })
    );
  }

  clickChannelHead(){
    this.openChannel = !this.openChannel;
  }

  clickMessageHead(){
    this.openMessage = !this.openMessage;
  }

  clickAddChannel() {
    this.addChannel.emit();
  }

  clickChannelName(index: number, channel: Channel) {
    this.currentChannelIndex = index;
    this.router.navigate(['/dashboard', 'channels', channel.id]);
   
  }


  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
