import { Component, Input, inject } from '@angular/core';
import { toggleMarginLeft20Animation } from '../../animations/expand-collapse.animation';
import { ThreadService } from '../../../../core/services/thread-service/thread.service';

@Component({
  selector: 'app-thread-content',
  imports: [],
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

}
