import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelService } from '../../../../core/services/channel.service';
import { Channel } from '../../../../core/models/channel.interface';
import { toggleMarginRight20Animation, verticalMarginExpandCollapseAnimation } from '../../animations/expand-collapse.animation';
import { User } from '../../../../core/models/user.interface';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { user } from '@angular/fire/auth';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  animations: [verticalMarginExpandCollapseAnimation, toggleMarginRight20Animation],

})
export class SidebarComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("devspaceContent") devSpaceContentRef!:ElementRef<HTMLElement>;
  private subscriptions = new Subscription();
  channelService = inject(ChannelService);
  authService = inject(AuthService);
  userService = inject(UserService);
  channels: Channel[] = [];
  allUsers: User[] = [];
  currentUser: User | null = null;
  imgLoadStatus: Record<string, boolean> = {};
  isOverflowing = false;

  @Input() showSelf: boolean = true;
  @Output() addChannel = new EventEmitter<void>();

  openChannel = true;
  openMessage = true;

  currentChannelIndex: number = 0;

  ngOnInit(): void {
    
    
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
      })
    );
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
        this.allUsers = this.allUsers.filter(u => u.id !== this.currentUser?.id);
        this.checkOverflow();
      }));
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

  clickChannelName(index: number) {
    this.currentChannelIndex = index;
  }


  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngAfterViewInit() {
    this.subscriptions.add(
      this.channelService.getChannelsOrderByCreatedAt((data) => {
        this.channels = [];
        this.channels.push(...data);
      })
    );

    this.subCurrentUser();
  }

  onSectionAnimationDone() {
    this.checkOverflow();
  }

  checkOverflow() {
    const el = this.devSpaceContentRef.nativeElement;
    console.log(el.scrollHeight);
    console.log(el.clientHeight);
    
    setTimeout(()=>{
      this.isOverflowing = (el.scrollHeight - el.clientHeight) > 2;
    })
  }
}
