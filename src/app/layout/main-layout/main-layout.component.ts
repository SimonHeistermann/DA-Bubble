import { Component, inject,  OnInit,  } from '@angular/core';
import { ChannelService } from '../../core/services/channel.service';
import { Subscription } from 'rxjs';
import { Channel } from '../../core/models/channel.interface';
import {Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth-service/auth.service';
import { UserService } from '../../core/services/user-service/user.service';
import { User } from '../../core/models/user.interface';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  animations: []
})
export class MainLayoutComponent implements OnInit  {
  private subscriptions = new Subscription();
  authService = inject(AuthService);
  userService = inject(UserService);
  channelService = inject(ChannelService);
  router = inject(Router);

  currentUser: User | null = null;
  channels: Channel[] = [];
  
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
        this.subAllChannels();
      })
    );
  }

  subAllChannelsBackUp() {
    if(!this.currentUser) return;
    this.subscriptions.add(
      this.channelService.getChannelsOrderByCreatedAt(this.currentUser.id, (data) => {
        this.channels.length=0;
        this.channels.push(...data);

        const currentUrl = this.router.url;
        const isAlreadyOnAChannel = currentUrl.includes('/dashboard/channels/');

        
        if (!isAlreadyOnAChannel && this.channels.length > 0) {
          const firstChannelId = this.channels[0].id;
        
          this.router.navigate(['/dashboard/channels', firstChannelId]);
        } else {
          console.warn('No channels available');
        }
      })
    );
  }

  subAllChannels() {
    if(!this.currentUser) return;
    this.subscriptions.add(
      this.channelService.getChannelsOrderByCreatedAt(this.currentUser.id, (data) => {
        this.channels.length=0;
        this.channels.push(...data);

        const currentUrl = this.router.url;
        const isAlreadyOnAChannel = currentUrl.includes('/dashboard/channels/');

        
        if (!isAlreadyOnAChannel && this.channels.length > 0) {
          const firstChannelId = this.channels[0].id;
        
          this.router.navigate(['/dashboard/channels', firstChannelId]);
        } else {
          console.warn('No channels available');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
