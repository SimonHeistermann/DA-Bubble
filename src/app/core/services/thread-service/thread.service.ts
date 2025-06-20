import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThreadService {

  constructor() { }

  private showThread = new BehaviorSubject<boolean>(false);
  showThread$ = this.showThread.asObservable();

  toggleThread() {
    this.showThread.next(true);
  }

  show() {
    this.showThread.next(true);
  }

  hide() {
    this.showThread.next(false);
  }
}
