import { Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../../../core/services/channel.service';
import { expandCollapseAnimation } from '../../animations/expand-collapse.animation';


@Component({
  selector: 'app-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-channel.component.html',
  styleUrl: './add-channel.component.scss',
  animations: [expandCollapseAnimation]
})
export class AddChannelComponent {

  @Output() closeOverlay = new EventEmitter<void>();
  showChannelNameError = false;
  showAddUserContent = true;
  firstCbActivated = true;
  showChooseNameInput = false;
  errMsg = '';
  channelName: string = '';

  userService = inject(ChannelService);

  clickClose() {
    this.closeOverlay.emit();
  }

  clickCreateChannel() {
    this.userService.getChannels((data) => {
      const index = data.findIndex(e => e.name.toLowerCase() == this.channelName.toLowerCase());
      if (index !== -1) {
        this.errMsg = 'Der Channelname existiert schon';
        this.showChannelNameError = true;
      } else {
        this.showAddUsersOverlay();
      }
    })
  }

  clickAddSomeUsers() {
    this.firstCbActivated = false;
    this.showChooseNameInput = true;
  }

  showAddUsersOverlay() {
    this.showAddUserContent = true;
  }

  inputUserName() {
    
  }
}
