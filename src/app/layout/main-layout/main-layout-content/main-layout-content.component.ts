
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MainHeaderComponent } from './../components/main-header/main-header.component';
import { CommonModule } from '@angular/common';
import { AddChannelComponent } from './../components/add-channel/add-channel.component';
import { ChannelService } from '../../../core/services/channel.service';
import { Subscription } from 'rxjs';
import { Channel } from '../../../core/models/channel.interface';
import { SidebarComponent } from './../components/sidebar/sidebar.component';
import { MessageComponent } from './../components/message/message.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-main-layout-content',
  imports: [MainHeaderComponent, CommonModule, AddChannelComponent, SidebarComponent, MessageComponent],
  templateUrl: './main-layout-content.component.html',
  styleUrl: './main-layout-content.component.scss',
  animations: []
})
export class MainLayoutContentComponent implements AfterViewInit, OnInit  {
  @ViewChild('sidebar') sidebarRef!:SidebarComponent;

  route = inject(ActivatedRoute);
  
  showSidebar = true;
  showAddChannelOverlay = false;
  clickedChannel: Channel | null = null;

  ngOnInit() {
    
  }

  ngAfterViewInit(): void {
    this.route.paramMap.subscribe(params => {
      const channelId = params.get('channelId');
      if (channelId) {
        this.handleChannelChange(channelId);
      }
    });
  }

  handleChannelChange(channelId: string) {
    const sidebarRef = this.sidebarRef;
    const index = sidebarRef.channels.findIndex(c => c.id === channelId);
    
    if (index !== -1) {
      this.sidebarRef.currentChannelIndex = index;
      this.clickedChannel = this.sidebarRef.channels[index];
    }
  }

  toggleMenu(){
    this.showSidebar = !this.showSidebar;
  }

  onAddChannel() {
    console.log('add channel overlay');
    
    this.showAddChannelOverlay = true;
  }

  onClickChannelName(c: Channel){
    this.clickedChannel = c;
  }

  onLeaveChannel() {
    this.sidebarRef.clickChannelName(0, this.sidebarRef.channels[0]);
  }


}

