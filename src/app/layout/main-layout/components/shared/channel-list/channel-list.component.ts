
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimplebarAngularModule } from 'simplebar-angular'; 
import { Channel } from '../../../../../core/models/channel.interface';
import { ChannelService } from '../../../../../core/services/channel.service';
import { ThreadService } from '../../../../../core/services/thread-service/thread.service';
import { Subscription } from 'rxjs';
import { inject } from '@angular/core';

@Component({
  selector: 'app-channel-list',
  imports: [ CommonModule, SimplebarAngularModule ],
  templateUrl: './channel-list.component.html',
  styleUrl: './channel-list.component.scss'
})
export class ChannelListComponent implements AfterViewInit {
  @ViewChild("listContainer") listContainerRef!: ElementRef<HTMLElement>;
  private _dataSource: Channel[] = [];
  @Input() tagIDs: string[] = [];
  @Input() maxHeight = '30vh';
  @Input() editingMode = false;

  private subscriptions = new Subscription();

  channelService = inject(ChannelService);
  threadService = inject(ThreadService);
  @Input() currentChannelIndex = 0;
  @Output() clickChannelNameEmitter = new EventEmitter<Channel>();

  channels: Channel[] = [];

  isOverflowing = false;
  

  ngAfterViewInit() {
    this.subAllChannels();
    this.checkOverflow();
  }

  clickLi(c: Channel) {
    this.clickChannelNameEmitter.emit(c);
    }


  @Input()
  set dataSource(value: Channel[]) {
    
    this._dataSource = value;
    
    setTimeout(() => this.checkOverflow(), 0);
  }

  get dataSource(): Channel[] {
    
    return this._dataSource;
  }

 subAllChannels() {
    this.subscriptions.add(
      this.channelService.getChannels((data: Channel[]): void => {
        this.channels = [...data];
      })
    );
  }

  checkOverflow() {
    const el = this.listContainerRef.nativeElement;
    setTimeout(()=>{
      this.isOverflowing = (el.scrollHeight - el.clientHeight) > 2;
    })
  }
}
