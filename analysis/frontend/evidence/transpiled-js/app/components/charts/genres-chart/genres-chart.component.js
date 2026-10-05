import { Component, Input, viewChild, } from '@angular/core';
import { Chart } from 'chart.js';
const PALETTE = [
    'rgba(59, 130, 246, 0.85)',
    'rgba(16, 185, 129, 0.85)',
    'rgba(245, 158, 11, 0.85)',
    'rgba(139, 92, 246, 0.85)',
    'rgba(239, 68, 68, 0.85)',
    'rgba(14, 165, 233, 0.85)',
    'rgba(236, 72, 153, 0.85)',
    'rgba(20, 184, 166, 0.85)',
    'rgba(249, 115, 22, 0.85)',
    'rgba(99, 102, 241, 0.85)',
];
let GenresChartComponent = class GenresChartComponent {
    dataPoints = [];
    canvas = viewChild('canvas');
    chart = null;
    exportPng() {
        const el = this.canvas()?.nativeElement;
        if (!el)
            return;
        const link = document.createElement('a');
        link.download = 'zanrai.png';
        link.href = el.toDataURL('image/png');
        link.click();
    }
    ngOnChanges() {
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
            type: 'doughnut',
            data: {
                labels: this.dataPoints.map(dp => dp.genre),
                datasets: [
                    {
                        data: this.dataPoints.map(dp => dp.count),
                        backgroundColor: this.dataPoints.map((_, i) => PALETTE[i % PALETTE.length]),
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverOffset: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, padding: 14, font: { size: 13 } },
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                                return ` ${ctx.label}: ${ctx.parsed} kn. (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }
};
__decorate([
    Input()
], GenresChartComponent.prototype, "dataPoints", void 0);
GenresChartComponent = __decorate([
    Component({
        selector: 'app-genres-chart',
        template: `
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-header-text">
          <h2 class="chart-title">Knygos pagal žanrus</h2>
          <p class="chart-subtitle">Bibliotekos pasiskirstymas pagal žanrą</p>
        </div>
        <button class="export-btn" (click)="exportPng()" [disabled]="dataPoints.length === 0">Eksportuoti PNG</button>
      </div>
      @if (dataPoints.length === 0) {
        <div class="chart-empty">
          <span>Žanrų duomenų dar nėra. Pridėkite knygų į biblioteką.</span>
        </div>
      } @else {
        <div class="chart-body">
          <canvas #canvas></canvas>
        </div>
      }
    </div>
  `,
        styleUrl: './genres-chart.component.scss',
    })
], GenresChartComponent);
export { GenresChartComponent };
