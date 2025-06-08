import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MainHeaderComponent } from './components/main-header/main-header.component';
import { CommonModule } from '@angular/common';
import { AddChannelComponent } from './components/add-channel/add-channel.component';
import { ChannelService } from '../../core/services/channel.service';
import { Subscription } from 'rxjs';
import { Channel } from '../../core/models/channel.interface';

@Component({
  selector: 'app-main-layout',
  imports: [MainHeaderComponent, CommonModule, AddChannelComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  channelService = inject(ChannelService);
  channels: Channel[] = [];

  menuOpen = false;
  showOverlay = false;
  
  @ViewChild('overlay') overlay!: ElementRef;
  @ViewChild('main') main!: ElementRef;
  @ViewChild('devSpace') devSpace!: ElementRef;

  toggleMenu(){
    if (!this.menuOpen) {
      console.log(`Opening menu` + this.menuOpen);
      this.overlay.nativeElement.classList.add('show-menu');
      this.overlay.nativeElement.classList.remove('hide-menu'); 
      this.main.nativeElement.classList.add('shrink-menu');
      this.devSpace.nativeElement.classList.remove('d__none');
      this.menuOpen = true;
    } else {
      console.log(`Closing menu` + this.menuOpen);
      this.overlay.nativeElement.classList.remove('show-menu');
      this.overlay.nativeElement.classList.add('hide-menu'); 
      this.main.nativeElement.classList.remove('shrink-menu');
      this.devSpace.nativeElement.classList.add('d__none');
      this.menuOpen = false;
    }

  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.channelService.getChannelsOrderByCreatedAt((data) => {
        this.channels = [];
        this.channels.push(...data);
      })
    );
  }

  clickAddChannel() {
    console.log(this.showOverlay);
    
    this.showOverlay = true;
  }

  clickOverlay() {
    console.log('click overlay');
    
    this.showOverlay = false;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }


}
