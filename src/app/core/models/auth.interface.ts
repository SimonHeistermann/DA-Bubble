export interface LoginCredentials {
    email: string;
    password: string;
}
  
export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
}
  
export interface AuthUser {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    emailVerified: boolean;
}