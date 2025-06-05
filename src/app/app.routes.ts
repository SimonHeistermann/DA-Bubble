import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { RegisterComponent } from './features/auth/components/register/register.component';
import { ForgotPasswordComponent } from './features/auth/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/components/reset-password/reset-password.component';
import { DashboardComponent } from './features/dashboard/components/dashboard/dashboard.component';
import { AuthGuard } from './core/guards/auth-guard/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth-guard/no-auth.guard';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  { 
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [NoAuthGuard], 
    children: [
      {
        path: 'login',
        component: LoginComponent,
        title: 'Anmelden'
      },
      {
        path: 'register',
        component: RegisterComponent,
        title: 'Registrieren'
      },
      {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        title: 'Passwort vergessen'
      },
      {
        path: 'reset-password',
        component: ResetPasswordComponent,
        title: 'Passwort zurücksetzen',
        data: { requiresResetToken: true }
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'auth/register', pathMatch: 'full' },
  
  { 
    path: 'dashboard', 
    component: MainLayoutComponent,
    children: [
        {
            path: '',
            component: DashboardComponent,
            title: 'Dashboard'
        }
    ]
  },
  
  { 
    path: '', 
    redirectTo: 'dashboard',
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: 'auth/login'
  }
];