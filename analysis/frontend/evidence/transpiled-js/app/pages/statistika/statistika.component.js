import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { StatsService } from '../../services/stats.service';
import { BooksPerMonthChartComponent } from '../../components/charts/books-per-month-chart/books-per-month-chart.component';
import { PagesPerDayChartComponent } from '../../components/charts/pages-per-day-chart/pages-per-day-chart.component';
import { GenresChartComponent } from '../../components/charts/genres-chart/genres-chart.component';
Chart.register(...registerables);
function toIso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function parseIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}
function todayIso() {
    return toIso(new Date());
}
function capAtToday(iso) {
    return iso > todayIso() ? todayIso() : iso;
}
function shiftIsoDays(iso, days) {
    const d = parseIso(iso);
    d.setDate(d.getDate() + days);
    return toIso(d);
}
function daysBetween(startIso, endIso) {
    const msPerDay = 86_400_000;
    const start = parseIso(startIso).getTime();
    const end = parseIso(endIso).getTime();
    return Math.round((end - start) / msPerDay) + 1;
}
let StatistikaPuslapis = class StatistikaPuslapis {
    statsService = inject(StatsService);
    requestVersion = 0;
    presets = [
        { id: 'LAST_7_DAYS', label: 'Pask. 7 dienos' },
        { id: 'LAST_30_DAYS', label: 'Pask. 30 dienų' },
        { id: 'THIS_MONTH', label: 'Šis mėnuo' },
        { id: 'LAST_12_MONTHS', label: 'Pask. 12 mėn.' },
        { id: 'CUSTOM', label: 'Pasirinktinis' },
    ];
    selectedPreset = signal('LAST_7_DAYS');
    rangeStart = signal('');
    rangeEnd = signal('');
    customStart = signal('');
    customEnd = signal('');
    resolvedGranularity = signal('DAY');
    stats = signal(null);
    pagesPerDay = signal([]);
    genreStats = signal([]);
    isLoading = signal(false);
    error = signal('');
    isCustom = computed(() => this.selectedPreset() === 'CUSTOM');
    todayDate = todayIso();
    isCurrentPeriod = computed(() => this.rangeEnd() >= todayIso());
    filterContext = computed(() => {
        const granularity = this.resolvedGranularity();
        return `${this.rangeStart()} - ${this.rangeEnd()} · ${granularity}`;
    });
    ngOnInit() {
        this.applyPreset('LAST_7_DAYS');
    }
    applyPreset(preset) {
        this.selectedPreset.set(preset);
        if (preset === 'CUSTOM') {
            this.customStart.set(this.rangeStart() || shiftIsoDays(todayIso(), -6));
            this.customEnd.set(this.rangeEnd() || todayIso());
            return;
        }
        const range = this.getPresetRange(preset);
        this.rangeStart.set(range.start);
        this.rangeEnd.set(range.end);
        this.customStart.set(range.start);
        this.customEnd.set(range.end);
        this.loadAllStats();
    }
    onCustomStartChange(event) {
        this.customStart.set(event.target.value);
    }
    onCustomEndChange(event) {
        this.customEnd.set(event.target.value);
    }
    applyCustomRange() {
        const start = this.customStart();
        const end = capAtToday(this.customEnd());
        if (!start || !end || start > end) {
            this.error.set('Neteisingas datos intervalas. Patikrinkite start/end datas.');
            return;
        }
        this.error.set('');
        this.selectedPreset.set('CUSTOM');
        this.rangeStart.set(start);
        this.rangeEnd.set(end);
        this.loadAllStats();
    }
    prevPeriod() {
        const span = daysBetween(this.rangeStart(), this.rangeEnd());
        const start = shiftIsoDays(this.rangeStart(), -span);
        const end = shiftIsoDays(this.rangeEnd(), -span);
        this.rangeStart.set(start);
        this.rangeEnd.set(end);
        this.customStart.set(start);
        this.customEnd.set(end);
        this.loadAllStats();
    }
    nextPeriod() {
        if (this.isCurrentPeriod())
            return;
        const span = daysBetween(this.rangeStart(), this.rangeEnd());
        let start = shiftIsoDays(this.rangeStart(), span);
        let end = shiftIsoDays(this.rangeEnd(), span);
        if (end > todayIso()) {
            end = todayIso();
            start = shiftIsoDays(end, -(span - 1));
        }
        this.rangeStart.set(start);
        this.rangeEnd.set(end);
        this.customStart.set(start);
        this.customEnd.set(end);
        this.loadAllStats();
    }
    jumpToCurrentPeriod() {
        if (this.selectedPreset() !== 'CUSTOM') {
            this.applyPreset(this.selectedPreset());
            return;
        }
        const span = daysBetween(this.rangeStart(), this.rangeEnd());
        const end = todayIso();
        const start = shiftIsoDays(end, -(span - 1));
        this.rangeStart.set(start);
        this.rangeEnd.set(end);
        this.customStart.set(start);
        this.customEnd.set(end);
        this.loadAllStats();
    }
    getPresetRange(preset) {
        const today = todayIso();
        const todayDate = parseIso(today);
        switch (preset) {
            case 'LAST_7_DAYS':
                return { start: shiftIsoDays(today, -6), end: today };
            case 'LAST_30_DAYS':
                return { start: shiftIsoDays(today, -29), end: today };
            case 'THIS_MONTH': {
                const start = toIso(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
                return { start, end: today };
            }
            case 'LAST_12_MONTHS': {
                const start = toIso(new Date(todayDate.getFullYear(), todayDate.getMonth() - 11, 1));
                return { start, end: today };
            }
            default:
                return { start: shiftIsoDays(today, -6), end: today };
        }
    }
    resolveGranularity(range) {
        const span = daysBetween(range.start, range.end);
        if (span <= 14)
            return 'DAY';
        if (span <= 120)
            return 'WEEK';
        if (span <= 730)
            return 'MONTH';
        return 'YEAR';
    }
    loadAllStats() {
        if (!this.rangeStart() || !this.rangeEnd())
            return;
        const requestVersion = ++this.requestVersion;
        const range = { start: this.rangeStart(), end: this.rangeEnd() };
        const granularity = this.resolveGranularity(range);
        const days = daysBetween(range.start, range.end);
        this.resolvedGranularity.set(granularity);
        this.isLoading.set(true);
        this.error.set('');
        forkJoin({
            stats: this.statsService.getStats(granularity, range.end, range.start, range.end),
            pages: this.statsService.getPagesPerDay(days, range.end, range.start),
            genres: this.statsService.getGenreStats(),
        }).subscribe({
            next: ({ stats, pages, genres }) => {
                if (requestVersion !== this.requestVersion)
                    return;
                this.stats.set(stats);
                this.pagesPerDay.set(pages);
                this.genreStats.set(genres);
                this.isLoading.set(false);
            },
            error: () => {
                if (requestVersion !== this.requestVersion)
                    return;
                this.error.set('Nepavyko įkrauti statistikos. Bandykite dar kartą.');
                this.isLoading.set(false);
            },
        });
    }
};
StatistikaPuslapis = __decorate([
    Component({
        selector: 'app-statistika',
        imports: [CommonModule, BooksPerMonthChartComponent, PagesPerDayChartComponent, GenresChartComponent],
        templateUrl: './statistika.component.html',
        styleUrl: './statistika.component.scss',
    })
], StatistikaPuslapis);
export { StatistikaPuslapis };
