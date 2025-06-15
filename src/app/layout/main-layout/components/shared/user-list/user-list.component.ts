import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';
import { SimplebarAngularComponent, SimplebarAngularModule } from 'simplebar-angular';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, SimplebarAngularModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent{

  @Output() clickedUser = new EventEmitter<any>();
  private _dataSource: User[] = [];
  @Input() tagIDs: string[] = [];

  isOverflowing = false;

  clickLi(u: User) {
    this.clickedUser.emit(u);
  }

  @Input()
  set dataSource(value: User[]) {
    
    this._dataSource = value;
  }

  get dataSource(): User[] {
    return this._dataSource;
  }


 
}
