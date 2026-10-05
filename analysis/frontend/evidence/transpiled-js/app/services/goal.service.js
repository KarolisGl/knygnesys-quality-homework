import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let GoalService = class GoalService {
    http = inject(HttpClient);
    baseUrl = 'http://localhost:10032/api/goals';
    getGoal() {
        return this.http.get(this.baseUrl);
    }
    setGoal(targetBooks) {
        return this.http.post(this.baseUrl, { targetBooks });
    }
};
GoalService = __decorate([
    Injectable({ providedIn: 'root' })
], GoalService);
export { GoalService };
