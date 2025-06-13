import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelService } from '../../../../core/services/channel.service';
import { Channel } from '../../../../core/models/channel.interface';
import { toggleMarginRight20Animation, toggleMarginTop25Animation } from '../../animations/expand-collapse.animation';
import { User } from '../../../../core/models/user.interface';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  animations: [toggleMarginTop25Animation, toggleMarginRight20Animation],

})
export class SidebarComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("devspaceContent") devSpaceContentRef!:ElementRef<HTMLElement>;
  private subscriptions = new Subscription();
  channelService = inject(ChannelService);
  authService = inject(AuthService);
  userService = inject(UserService);
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
  }

  ngAfterViewInit() {
    this.checkOverflow();
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
        this.channels.length=0;
        this.channels.push(...data);
        
        if (this.channels.length > 0) {
          this.clickChannelNameEmitter.emit(this.channels[this.currentChannelIndex]);
        }
      })
    );
  }

  clickChannelHead(){
    
    this.openChannel = !this.openChannel;
    this.checkOverflow();
  }

  clickMessageHead(){
    this.openMessage = !this.openMessage;
    this.checkOverflow();
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

  
  onSectionAnimationDone() {
    this.checkOverflow();
  }

  checkOverflow() {
    const el = this.devSpaceContentRef.nativeElement;
    
    setTimeout(()=>{
      this.isOverflowing = (el.scrollHeight - el.clientHeight) > 2;
    })
  }
}
