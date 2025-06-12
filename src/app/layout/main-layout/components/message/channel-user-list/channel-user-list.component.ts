import { Component, ElementRef, EventEmitter, inject, Input, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { slideFadeInAnimation } from '../../../animations/slide.animation';
import { ProfileComponent } from '../../shared/profile/profile.component';
import { CommonModule } from '@angular/common';
import { OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../../core/services/overlay.service';

@Component({
  selector: 'app-channel-user-list',
  imports: [ProfileComponent, CommonModule],
  standalone: true,
  templateUrl: './channel-user-list.component.html',
  styleUrl: './channel-user-list.component.scss',
  animations: [slideFadeInAnimation]
})
export class ChannelUserListComponent {
  @Input() currentUser: User | null = null;
  @Input() allChannelUsers: User[] = [];

  @Output() closeOverlayEmitter = new EventEmitter<void>();
  @Output() addMemberEmitter = new EventEmitter<void>();

  showProfileOverlay = false;
  currentUserIndex = -1;
  selectedUser: User | null = null;

  _showOverlay = false;
  overlayRef!: OverlayRef;
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);
  @ViewChild('channelUserListTemplate') channelUserListTemplate!: TemplateRef<any>;
  @Input() userListRef: ElementRef | null = null;

  closeOverlay() {
    this.overlayRef.dispose();
    this.closeOverlayEmitter.emit();
  }

  @Input()
  set showOverlay(value: boolean) {
    this._showOverlay = value;
    if (value) {
       this.openUserListOverlay();
    }
  }

  showProfile(index: number){
    
    this.currentUserIndex = index;
    this.showProfileOverlay = true;
    this.selectedUser = this.allChannelUsers[index];
  }

  addMember() {
    this.addMemberEmitter.emit();
  }

  openUserListOverlay() {
   if (!this.userListRef) return;
    let positions = this.overlayService.defaultPositions;
    positions[0] = { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' };

    this.overlayRef = this.overlayService.openTemplateOverlay(
      this.userListRef, 
      this.channelUserListTemplate, 
      this.viewContainerRef, 
    );

    this.overlayRef.backdropClick().subscribe(() => this.closeUserListOverlay());
  }

  closeUserListOverlay() {
    this.overlayRef?.dispose();
    this.closeOverlayEmitter.emit();
  }

}
