import { Component, ElementRef, EventEmitter, inject, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../../../core/services/channel.service';
import { expandCollapseAnimation } from '../../animations/expand-collapse.animation';
import { RichtextEditorComponent } from '../shared/richtext-editor/richtext-editor.component';
import { UserListComponent } from '../shared/user-list/user-list.component';


@Component({
  selector: 'app-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, RichtextEditorComponent, UserListComponent],
  templateUrl: './add-channel.component.html',
  styleUrl: './add-channel.component.scss',
  animations: [expandCollapseAnimation]
})
export class AddChannelComponent {
  filteredUsers: any[] = [];
  dummyUsers = [
    {'img': 'avatar_1.png',
      'status': 'online',
      'name': 'Adson Mischner'
    },
    {'img': 'avatar_1.png',
      'status': 'offline',
      'name': 'Xin Yang'
    },
    {'img': 'avatar_1.png',
      'status': 'offline',
      'name': 'Xiongzi Yang'
    },
    {'img': 'avatar_1.png',
      'status': 'offline',
      'name': 'Anna Yang'
    },
    {'img': 'avatar_1.png',
      'status': 'offline',
      'name': 'Anna Yang 1'
    },
    {'img': 'avatar_1.png',
      'status': 'online',
      'name': 'Anna Yang 2'
    },
    {'img': 'avatar_1.png',
      'status': 'online',
      'name': 'Anna Yang 3'
    },
    {'img': 'avatar_1.png',
      'status': 'online',
      'name': 'Anna Yang 4'
    },
    {'img': 'avatar_1.png',
      'status': 'online',
      'name': 'Anna Yang 5'
    },
  ]

  @Output() closeOverlay = new EventEmitter<void>();
  editorEl!: HTMLDivElement;
  @ViewChild("richtextEditor") richtextEditorRef!: RichtextEditorComponent;
  showChannelNameError = false;
  showAddUserContent = true;
  firstCbActivated = true;
  showChooseNameInput = false;
  showUserList = false;
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
    console.log(11);
  }

  onEditorReady(el: HTMLDivElement) {
    this.editorEl = el;
  }

  onEditorValueChanged(html: string) {
    console.log('emmited html:', html);
    
    if(html.trim().length > 0) {
      
      this.filteredUsers = this.dummyUsers.filter(u => u.name.toLowerCase().startsWith(html.toLowerCase()));
      this.showUserList = true;
    } else {
      this.showUserList = false;
    }


  }

  onClickedUser(u: any) {
    console.log(u);
    this.richtextEditorRef.insertTag(u);
  }
}
