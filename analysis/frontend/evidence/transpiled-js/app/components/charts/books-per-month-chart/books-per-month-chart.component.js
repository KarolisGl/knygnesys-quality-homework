import { Component, computed, Input, signal, viewChild, } from '@angular/core';
import { Chart } from 'chart.js';
const TITLES = {
    DAY: 'Knygos per dieną',
    WEEK: 'Knygos per savaitę',
    MONTH: 'Knygos per mėnesį',
    YEAR: 'Knygos per metus',
};
const SUBTITLES = {
    DAY: 'Pridėtos ir perskaitytos knygos per pasirinktą dieną',
    WEEK: 'Pridėtos ir perskaitytos knygos per pasirinktą savaitę',
    MONTH: 'Pridėtos ir perskaitytos knygos per pasirinktą mėnesį',
    YEAR: 'Pridėtos ir perskaitytos knygos per pasirinktus metus',
};
let BooksPerMonthChartComponent = class BooksPerMonthChartComponent {
    dataPoints = [];
    period = 'YEAR';
    _period = signal('YEAR');
    chartTitle = computed(() => TITLES[this._period()] ?? TITLES['YEAR']);
    chartSubtitle = computed(() => SUBTITLES[this._period()] ?? SUBTITLES['YEAR']);
    canvas = viewChild('canvas');
    chart = null;
    exportPng() {
        const el = this.canvas()?.nativeElement;
        if (!el)
            return;
        const link = document.createElement('a');
        link.download = 'knygos-per-menesi.png';
        link.href = el.toDataURL('image/png');
        link.click();
    }
    ngOnChanges() {
        this._period.set(this.period);
        setTimeout(() => this.render());
    }
    ngOnDestroy() {
        this.chart?.destroy();
    }
    render() {
        const el = this.canvas()?.nativeElement;
        if (!el)
            return;
        this.chart?.destroy();
        this.chart = new Chart(el, {
            type: 'bar',
            data: {
                labels: this.dataPoints.map(dp => dp.label),
                datasets: [
                    {
                        label: 'Pridėta knygų',
                        data: this.dataPoints.map(dp => dp.booksAdded),
                        backgroundColor: 'rgba(59, 130, 246, 0.75)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: 'Perskaityta knygų',
                        data: this.dataPoints.map(dp => dp.booksCompleted),
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
                    tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxTicksLimit: 12,
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                        },
                    },
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
                },
            },
        });
    }
};
__decorate([
    Input()
], BooksPerMonthChartComponent.prototype, "dataPoints", void 0);
__decorate([
    Input()
], BooksPerMonthChartComponent.prototype, "period", void 0);
BooksPerMonthChartComponent = __decorate([
    Component({
        selector: 'app-books-per-month-chart',
        template: `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h2 class="chart-title">{{ chartTitle() }}</h2>
          <p class="chart-subtitle">{{ chartSubtitle() }}</p>
        </div>
        <button class="export-btn" (click)="exportPng()">Eksportuoti PNG</button>
      </div>
      <div class="chart-body">
        <canvas #canvas></canvas>
      </div>
    </div>
  `,
        styleUrl: './books-per-month-chart.component.scss',
    })
], BooksPerMonthChartComponent);
export { BooksPerMonthChartComponent };
