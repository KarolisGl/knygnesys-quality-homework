import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let StatsService = class StatsService {
    http = inject(HttpClient);
    baseUrl = 'http://localhost:10032/api/stats';
    getStats(period, date, startDate, endDate) {
        const params = { period };
        if (date)
            params['date'] = date;
        if (startDate)
            params['startDate'] = startDate;
        if (endDate)
            params['endDate'] = endDate;
        return this.http.get(this.baseUrl, { params });
    }
    getPagesPerDay(days = 30, endDate, startDate) {
        const params = { days };
        if (endDate)
            params['endDate'] = endDate;
        if (startDate)
            params['startDate'] = startDate;
        return this.http.get(`${this.baseUrl}/pages`, { params });
    }
    getGenreStats() {
        return this.http.get(`${this.baseUrl}/genres`);
    }
};
StatsService = __decorate([
    Injectable({ providedIn: 'root' })
], StatsService);
export { StatsService };
