import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
let NavbarComponent = class NavbarComponent {
    authService = inject(AuthService);
    router = inject(Router);
    logout() {
        this.authService.logout().subscribe({
            next: () => this.router.navigate(['/login']),
            error: () => this.router.navigate(['/login']),
        });
    }
};
NavbarComponent = __decorate([
    Component({
        selector: 'app-navbar',
        imports: [RouterLink, RouterLinkActive],
        templateUrl: './navbar.component.html',
        styleUrl: './navbar.component.scss',
    })
], NavbarComponent);
export { NavbarComponent };
