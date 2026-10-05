import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
let LoginComponent = class LoginComponent {
    authService = inject(AuthService);
    router = inject(Router);
    username = '';
    password = '';
    error = '';
    login() {
        this.authService.login(this.username, this.password).subscribe({
            next: () => this.router.navigate(['/']),
            error: () => this.error = 'Neteisingas vartotojo vardas arba slaptažodis'
        });
    }
};
LoginComponent = __decorate([
    Component({
        selector: 'app-login',
        standalone: true,
        imports: [FormsModule, RouterLink],
        templateUrl: './login.component.html',
        styleUrl: './login.component.scss'
    })
], LoginComponent);
export { LoginComponent };
