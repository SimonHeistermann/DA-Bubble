import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-footer',
  imports: [CommonModule, RouterModule],
  templateUrl: './auth-footer.component.html',
  styleUrl: './auth-footer.component.scss'
})
export class AuthFooterComponent {
  constructor(private router: Router) {}

  get isLoginPage(): boolean {
    return this.router.url.startsWith('/auth/login');
  } 
}
