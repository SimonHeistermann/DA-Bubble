import { Routes, UrlSegment, UrlMatchResult } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { RegisterComponent } from './features/auth/components/register/register.component';
import { ForgotPasswordComponent } from './features/auth/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/components/reset-password/reset-password.component';
import { AuthGuard } from './core/guards/auth-guard/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth-guard/no-auth.guard';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { MessageComponent } from './layout/main-layout/components/message/message.component';
import { MainLayoutContentComponent } from './layout/main-layout/main-layout-content/main-layout-content.component';
import { ChooseAvatarComponent } from './features/auth/components/choose-avatar/choose-avatar.component';
import { LegalNoticeComponent } from './features/auth/components/legal-notice/legal-notice.component';
import { PrivacyPolicyComponent } from './features/auth/components/privacy-policy/privacy-policy.component';

function caseInsensitiveMatch(path: string) {
  return (segments: UrlSegment[]): UrlMatchResult | null => {
    if (segments.length === 1 && segments[0].path.toLowerCase() === path.toLowerCase()) {
      return { consumed: segments };
    }
    return null;
  };
}

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [NoAuthGuard],
    children: [
      {
        matcher: caseInsensitiveMatch('login'),
        component: LoginComponent,
        title: 'Anmelden'
      },
      {
        matcher: caseInsensitiveMatch('register'),
        component: RegisterComponent,
        title: 'Registrieren'
      },
      {
        matcher: caseInsensitiveMatch('choose-avatar'),
        component: ChooseAvatarComponent,
        title: 'Avatar auswählen'
      },
      {
        matcher: caseInsensitiveMatch('forgot-password'),
        component: ForgotPasswordComponent,
        title: 'Passwort vergessen'
      },
      {
        matcher: caseInsensitiveMatch('reset-password'),
        component: ResetPasswordComponent,
        title: 'Passwort zurücksetzen',
        data: { requiresResetToken: true }
      },
      {
        matcher: caseInsensitiveMatch('legal-notice'),
        component: LegalNoticeComponent,
        title: 'Impressum'
      },
      {
        matcher: caseInsensitiveMatch('privacy-policy'),
        component: PrivacyPolicyComponent,
        title: 'Datenschutzerklärung'
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: '**',
        redirectTo: 'login'
      }
    ]
  },

  { matcher: caseInsensitiveMatch('login'), redirectTo: 'auth/login', pathMatch: 'full' },
  { matcher: caseInsensitiveMatch('register'), redirectTo: 'auth/register', pathMatch: 'full' },

  {
    path: 'dashboard',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', 
        component:  MainLayoutContentComponent, 
        children:[
          { path: 'channels/:channelId', component: MessageComponent },
          { path: 'users/:userId', component: MessageComponent },
          { path: 'search', component: MessageComponent },
        ]}
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