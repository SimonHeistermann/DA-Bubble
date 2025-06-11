import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MainHeaderComponent } from './components/main-header/main-header.component';
import { CommonModule } from '@angular/common';
import { AddChannelComponent } from './components/add-channel/add-channel.component';
import { ChannelService } from '../../core/services/channel.service';
import { Subscription } from 'rxjs';
import { Channel } from '../../core/models/channel.interface';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { MessageComponent } from './components/message/message.component';

@Component({
  selector: 'app-main-layout',
  imports: [MainHeaderComponent, CommonModule, AddChannelComponent, SidebarComponent, MessageComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  animations: []
})
export class MainLayoutComponent  {
  @ViewChild('sidebar') sidebarRef!:SidebarComponent;
  
  showSidebar = true;
  showAddChannelOverlay = false;
  clickedChannel: Channel | null = null;

  

  toggleMenu(){
    this.showSidebar = !this.showSidebar;
  }

  onAddChannel() {
    console.log('onAddChannel');
    this.showAddChannelOverlay = true;
  }

  onClickChannelName(c: Channel){
    this.clickedChannel = c;
  }

  onLeaveChannel() {
    this.sidebarRef.clickChannelName(0, this.sidebarRef.channels[0]);
  }


}
