import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
let AuthService = class AuthService {
    http = inject(HttpClient);
    apiUrl = 'http://localhost:10032/api/auth';
    currentUsername = signal(localStorage.getItem('knygnesys-username'));
    register(email, username, password) {
        return this.http.post(`${this.apiUrl}/register`, { email, username, password });
    }
    login(username, password) {
        return this.http.post(`${this.apiUrl}/login`, { username, password }).pipe(tap(() => {
            this.currentUsername.set(username);
            localStorage.setItem('knygnesys-username', username);
        }));
    }
    logout() {
        return this.http.post(`${this.apiUrl}/logout`, {}).pipe(tap(() => {
            this.currentUsername.set(null);
            localStorage.removeItem('knygnesys-username');
        }));
    }
};
AuthService = __decorate([
    Injectable({ providedIn: 'root' })
], AuthService);
export { AuthService };
