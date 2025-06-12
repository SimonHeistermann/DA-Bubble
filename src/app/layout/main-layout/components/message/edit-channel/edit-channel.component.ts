import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { slideFadeInAnimation } from '../../../animations/slide.animation';
import { CommonModule } from '@angular/common';
import { padding20Animation } from '../../../animations/padding.animation';
import { AutoResizeDirective } from '../../../../../core/directives/auto-resize.directive';
import { Channel } from '../../../../../core/models/channel.interface';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { User } from '../../../../../core/models/user.interface';
import { ChannelService } from '../../../../../core/services/channel.service';


@Component({
  selector: 'app-edit-channel',
  imports: [CommonModule, AutoResizeDirective, FormsModule],
  templateUrl: './edit-channel.component.html',
  styleUrl: './edit-channel.component.scss',
  animations: [slideFadeInAnimation, padding20Animation]
})
export class EditChannelComponent implements OnChanges, OnDestroy {
  @Output() closeOverlayEmitter = new EventEmitter<void>(); 
  @Output() closeEditChannelOverlayEmitter = new EventEmitter<boolean>(); 

  @Input() currentChannel: Channel | null = null;
  @Input() currentUser: User | null = null;

  showChannelNameInput = false;
  showDescriptionInput = false;
  channelName: string = '';
  channelDescription: string = '';

  private subscriptions = new Subscription();
  userService = inject(UserService);
  channelService = inject(ChannelService);
  createdUser: User | null = null;
  

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentChannel'] && changes['currentChannel'].currentValue) {
      this.fetchUserByID();
    }
  }

  fetchUserByID() {
    if (this.currentChannel?.createdBy) {
      this.subscriptions.add(this.userService.getUserById(this.currentChannel?.createdBy).subscribe({
        next: ((user) => {
          this.createdUser = user;
        })
      }));
    }
  }

  updateChannel() {
    const currentChannel = this.currentChannel;
    if (currentChannel?.id) {
      let {id, ...channelData} = currentChannel;
      console.log(currentChannel.name);
      
      this.subscriptions.add( 
        this.channelService.updateChannel(currentChannel.id, channelData).subscribe()
      );
    }
  }

  clickEditName() {
    this.showChannelNameInput = true;
    this.channelName = this.currentChannel?.name || '';
  }

  clickSaveName() {
    this.showChannelNameInput = false;
    if (this.currentChannel) this.currentChannel.name = this.channelName;
    this.updateChannel();
  }

  clickEditDescription() {
    this.showDescriptionInput = true;
    this.channelDescription = this.currentChannel?.description || '';
  }

  clickSaveDescription() {
    this.showDescriptionInput = false;
    if (this.currentChannel) this.currentChannel.description = this.channelDescription;
    this.updateChannel();
  }

  clickLeaveChannel() {
    const currentUser = this.currentUser;
    const currentChannel = this.currentChannel;
    if (!currentChannel || !currentUser)  return;
    
    const updatedChannel = { ...currentChannel };
    const index = updatedChannel.userIDs.indexOf(currentUser.id);
    if (index !== -1) updatedChannel.userIDs.splice(index, 1);

    let {id, ...channelData} = updatedChannel;
    this.subscriptions.add( 
      this.channelService.updateChannel(currentChannel.id, channelData).subscribe({
        complete: () => this.closeEditChannelOverlayEmitter.emit(true)
      })
    );
    
  }

  closeOverlay(){
    this.closeEditChannelOverlayEmitter.emit(false);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
