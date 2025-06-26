import { Component, Input, inject } from '@angular/core';
import { toggleMarginLeft20Animation } from '../../animations/expand-collapse.animation';
import { ThreadService } from '../../../../core/services/thread-service/thread.service';
import { MessageBoxComponent } from '../message/message-box/message-box.component';
import { InputComponent } from '../shared/input/input.component';

@Component({
  selector: 'app-thread-content',
  imports: [ MessageBoxComponent, InputComponent ],
  templateUrl: './thread-content.component.html',
  styleUrl: './thread-content.component.scss',
  animations: [toggleMarginLeft20Animation]
})
export class ThreadContentComponent {

  @Input() showSelf: boolean = true;

  threadService = inject(ThreadService);


  hideThreadContainer() {
    this.threadService.hide();
  }

readMessage() {
  console.log(`ReadMessage called`);
  
  }

  sendMessage(msg: string) {
  console.log(msg);
  
  }

}
