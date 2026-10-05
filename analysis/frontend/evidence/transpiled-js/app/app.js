import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { CommonModule } from '@angular/common';
let App = class App {
    router;
    constructor(router) {
        this.router = router;
    }
    get showNavbar() {
        const url = this.router.url;
        return url !== '/login' && url !== '/register';
    }
};
App = __decorate([
    Component({
        selector: 'app-root',
        imports: [RouterOutlet, NavbarComponent, CommonModule],
        templateUrl: './app.html',
    })
], App);
export { App };
