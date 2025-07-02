import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { AuthInterceptor } from './core/interceptors/auth-interceptor/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error-interceptor/error.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

const firebaseConfig = {
  apiKey: "AIzaSyAh-rxlGTMfff0mO6iDf6mMaObs4b9cvR4",
  authDomain: "da-bubble-fd5b3.firebaseapp.com",
  projectId: "da-bubble-fd5b3",
  storageBucket: "da-bubble-fd5b3.firebasestorage.app",
  messagingSenderId: "625995397063",
  appId: "1:625995397063:web:68295c29cd7dabb7568be2"
};


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        AuthInterceptor,
        ErrorInterceptor
      ])
    ),
    provideFirebaseApp(() => initializeApp(firebaseConfig)), 
    provideAuth(() => getAuth()), 
    provideFirestore(() => getFirestore()), 
    provideDatabase(() => getDatabase()), 
    provideStorage(() => getStorage()),
    provideAnimations(),
  ]
};