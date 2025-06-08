import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements AfterViewInit{
  @ViewChild("listContainer") listContainerRef!: ElementRef<HTMLElement>;
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
