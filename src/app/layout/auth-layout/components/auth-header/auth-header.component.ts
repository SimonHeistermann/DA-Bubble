import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, RouterModule],
  templateUrl: './auth-header.component.html',
  styleUrl: './auth-header.component.scss'
})
export class AuthHeaderComponent {
  constructor(private router: Router) {}

  get isLoginPage(): boolean {
    return this.router.url.startsWith('/auth/login');
  }  
}
