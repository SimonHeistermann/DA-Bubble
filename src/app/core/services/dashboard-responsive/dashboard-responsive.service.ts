import { Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardResponsiveService {

  private normalScreen = new BehaviorSubject<boolean>(true);
  private smallScreen = new BehaviorSubject<boolean>(false);
  private isMobile = new BehaviorSubject<boolean>(false);
  private isTablet = new BehaviorSubject<boolean>(false);
  private searchBreakpoint = new BehaviorSubject<boolean>(false);

  private openMain = new BehaviorSubject<boolean>(false);
  private openSidebar = new BehaviorSubject<boolean>(true);
  private openThread = new BehaviorSubject<boolean>(false);

  normalScreen$ = this.normalScreen.asObservable();
  smallScreen$ = this.smallScreen.asObservable();
  isTablet$ = this.isTablet.asObservable();
  isMobile$ = this.isMobile.asObservable();
  searchBreakpoint$ = this.searchBreakpoint.asObservable(); 

  openMain$ = this.openMain.asObservable();
  openSidebar$ = this.openSidebar.asObservable();
  openThread$ = this.openThread.asObservable();
  

  constructor( private breakpointObserver: BreakpointObserver ) { 
     this.breakpointObserver.observe(['(min-width: 960px)']).subscribe(result => {
      this.normalScreen.next(result.matches);
    });

    this.breakpointObserver.observe(['(max-width: 1420px)']).subscribe(result => {
      this.smallScreen.next(result.matches);
    });

    this.breakpointObserver.observe(['(max-width: 1024px)']).subscribe(result => {
      this.isTablet.next(result.matches);
    });

    this.breakpointObserver.observe(['(max-width: 960px)']).subscribe(result =>{
      this.searchBreakpoint.next(result.matches);
    })

    this.breakpointObserver.observe(['(max-width: 575px)']).subscribe(result => {
      this.isMobile.next(result.matches);
    });
   }

  setOpenMain(open: boolean) {
    this.openMain.next(open);
    this.openSidebar.next(!open); 
    this.openThread.next(!open);
  }

  setOpenSidebar(open: boolean) {
    this.openSidebar.next(open);
    this.openMain.next(!open);
    this.openThread.next(!open);
  }

  setOpenThread(open: boolean) { 
    this.openThread.next(open);
    this.openMain.next(!open);
    this.openSidebar.next(!open);
  }

  getOpenMain(): boolean {
    return this.openMain.value;
  }

  getOpenSidebar(): boolean {
    return this.openSidebar.value;
  }

  getOpenThread(): boolean {
    return this.openThread.value;
  }
   
}
