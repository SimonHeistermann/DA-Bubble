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
  
  showSidebar = true;
  showOverlay = false;
  
  @ViewChild('overlay') overlay!: ElementRef;
  @ViewChild('main') main!: ElementRef;
  @ViewChild('devSpace') devSpace!: ElementRef;

  toggleMenu(){
    this.showSidebar = !this.showSidebar;
  }

  onAddChannel() {
    this.showOverlay = true;
  }

  clickOverlay() {
    console.log('click overlay');
    
    this.showOverlay = false;
  }

  


}
