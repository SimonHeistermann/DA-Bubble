import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements AfterViewInit{
  @ViewChild("listContainer") listContainerRef!: ElementRef<HTMLElement>;
  @Output() clickedUser = new EventEmitter<any>();
  private _dataSource: any[] = [];

  isOverflowing = false;

  clickLi(u: any) {
    this.clickedUser.emit(u);
  }

  @Input()
  set dataSource(value: any[]) {
    this._dataSource = value;
    setTimeout(() => this.checkOverflow(), 0);
  }

  get dataSource(): any[] {
    return this._dataSource;
  }


  ngAfterViewInit() {
    this.checkOverflow();
  }

  checkOverflow() {
    const el = this.listContainerRef.nativeElement;
    
    setTimeout(()=>{
      this.isOverflowing = (el.scrollHeight - el.clientHeight) > 1;
    })
    
  }
}
