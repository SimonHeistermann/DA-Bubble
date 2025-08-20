import { Component, ElementRef, HostListener, inject, Injectable, Input, input, OnInit, ViewChild } from '@angular/core';
import { Channel } from '../../../../../core/models/channel.interface';
import { User } from '../../../../../core/models/user.interface';
import { Subject, Subscription } from 'rxjs';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { AuthService } from '../../../../../core/services/auth-service/auth.service';
import { ChannelService } from '../../../../../core/services/channel.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserChannelActivityService } from '../../../../../core/services/userReadActivity.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class CommunicatorService {
  private channelSource = new Subject<Channel>();
  private userSource = new Subject<User>();

  channelMessage$ = this.channelSource.asObservable();
  userMessage$ = this.userSource.asObservable();

  sendChannelMessage(channel: Channel) {
    this.channelSource.next(channel);
  }

  sendUserMessage(user: User) {
    this.userSource.next(user);
  }
}

@Component({
  selector: 'app-search-message-header',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './search-message-header.component.html',
  styleUrl: './search-message-header.component.scss'
})
export class SearchMessageHeaderComponent implements OnInit {
  @ViewChild('wrapper') wrapperRef!: ElementRef;

  currentUser: User | null = null;
  allUsers: User[]  = [];
  allChannel: Channel[]  = [];
  filteredUsers: User[] = [];
  filteredChannels: Channel[] = [];

  private subscriptions = new Subscription();
  communicator = inject(CommunicatorService);
  userService = inject(UserService);
  authService = inject(AuthService);
  channelService = inject(ChannelService);
  userChannelActivityService = inject(UserChannelActivityService)
  router = inject(Router)

  inputContent: string = '';
  showList = false;
  showUserList = true;
  showChannelList = true;

  ngOnInit(): void {
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
        this.allChannel = [...data];
      })
    );
  }

  inputText() {
    const value = this.inputContent.trim();

    if (!value) {
      this.showList = false;
      return;
    }
    
    this.showList = true;
    if (value.startsWith('@')) {
      this.filterUsers(value);
    } else if (value.startsWith('#')) {
      this.filterChannel(value);
    } else {
      this.filterByName(value);
    }
  }

  filterUsers(value: string) {
    this.filteredChannels = [];
    this.showUserList = true;
    this.showChannelList = false;

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
    
    this.showUserList = false;
    this.showChannelList = true;

    const search = value.slice(1).toLowerCase(); // remove '#'

    this.filteredChannels = this.allChannel?.filter(channel =>
      channel.name.toLowerCase().includes(search)
    ) || [];
  }

  filterByName(value: string) {
    this.filteredChannels = [];
    this.showUserList = true;
    this.showChannelList = false;

    this.filteredUsers = this.allUsers?.filter(user =>
      user.displayName.toLowerCase().includes(value) ||  user.email.toLowerCase().includes(value)
    ) || [];
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

  clickUser(user: User){
    this.communicator.sendUserMessage(user);
    if(user && this.currentUser) {
      this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser?.id, user.id);
    } 
    this.router.navigate(['/dashboard', 'users', user.id]);
  }

  clickChannel(channel: Channel) {
    this.communicator.sendChannelMessage(channel);
    
    if (this.currentUser) {
       this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser?.id, channel.id);
    }
    this.router.navigate(['/dashboard', 'channels', channel.id]);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.wrapperRef.nativeElement.contains(event.target)) {
      this.showList = false;
      this.filteredUsers = [];
    this.filteredChannels = [];
    }
  }

}
