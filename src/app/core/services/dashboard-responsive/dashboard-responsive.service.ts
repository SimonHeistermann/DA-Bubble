import { Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardResponsiveService {

  private smallScreen = new BehaviorSubject<boolean>(false);
  private isMobile = new BehaviorSubject<boolean>(false);
  private openMain = new BehaviorSubject<boolean>(false);
  private openSidebar = new BehaviorSubject<boolean>(true);

  smallScreen$ = this.smallScreen.asObservable();
  isMobile$ = this.isMobile.asObservable();
  openMain$ = this.openMain.asObservable();
  openSidebar$ = this.openSidebar.asObservable();
  

  constructor( private breakpointObserver: BreakpointObserver ) { 
    this.breakpointObserver.observe(['(max-width: 1420px)']).subscribe(result => {
      this.smallScreen.next(result.matches);
    });

    this.breakpointObserver.observe(['(max-width: 960px)']).subscribe(result => {
      this.isMobile.next(result.matches);
    });
   }

  setOpenMain(open: boolean) {
    this.openMain.next(open);
    this.openSidebar.next(!open); 
  }

  setOpenSidebar(open: boolean) {
    this.openSidebar.next(open);
    this.openMain.next(!open);
  }

  getOpenMain(): boolean {
    return this.openMain.value;
  }

  getOpenSidebar(): boolean {
    return this.openSidebar.value;
  }
   
}
