import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, Output, ViewChild } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';
import { SimplebarAngularModule } from 'simplebar-angular'; 
import { ThreadService } from '../../../../../core/services/thread-service/thread.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ CommonModule, SimplebarAngularModule ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements AfterViewInit{
  @ViewChild("listContainer") listContainerRef!: ElementRef<HTMLElement>;
  @Output() clickedUser = new EventEmitter<any>();
  private _dataSource: User[] = [];
  @Input() tagIDs: string[] = [];
  @Input() maxHeight = '30vh';
  @Input() editingMode = false;

  constructor(private threadService: ThreadService) {}

  isOverflowing = false;
  

  clickLi(u: User) {
    this.clickedUser.emit(u);
    if (this.threadService.threadOpen) {
    this.threadService.setSelectedUser(u);
    }
  }

  @Input()
  set dataSource(value: User[]) {
    
    this._dataSource = value;
    setTimeout(() => this.checkOverflow(), 0);
  }

  get dataSource(): User[] {
    return this._dataSource;
  }


  ngAfterViewInit() {
    this.checkOverflow();
  }

  checkOverflow() {
    const el = this.listContainerRef.nativeElement;
    setTimeout(()=>{
      this.isOverflowing = (el.scrollHeight - el.clientHeight) > 2;
    })
  }
}
