import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { BookSearchService } from '../../services/book-search.service';
import { LibraryService } from '../../services/library.service';
import { GoalService } from '../../services/goal.service';
let Home = class Home {
    bookSearch = inject(BookSearchService);
    libraryService = inject(LibraryService);
    goalService = inject(GoalService);
    searchSubject = new Subject();
    destroy$ = new Subject();
    searchQuery = '';
    searchResults = [];
    isLoading = false;
    hasSearched = false;
    errorMessage = '';
    library = signal([]);
    addingBookKey = signal(null);
    recommendations = signal([]);
    recommendationsLoading = signal(false);
    goal = signal(null);
    settingGoal = signal(false);
    newGoalTarget = 10;
    statsTotal = computed(() => this.library().length);
    statsFinished = computed(() => this.library().filter(b => b.status === 'FINISHED').length);
    statsReading = computed(() => this.library().filter(b => b.status === 'READING').length);
    statsPages = computed(() => this.library().reduce((sum, b) => sum + (b.currentPage ?? 0), 0));
    constructor() {
        this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), switchMap(query => {
            this.isLoading = true;
            this.hasSearched = true;
            this.errorMessage = '';
            this.searchResults = [];
            return this.bookSearch.search(query).pipe(catchError(() => {
                this.errorMessage = 'Nepavyko įkrauti rezultatų. Bandykite dar kartą.';
                return of([]);
            }));
        }), takeUntil(this.destroy$)).subscribe(results => {
            this.searchResults = results;
            this.isLoading = false;
        });
        this.loadLibrary();
        this.loadGoal();
    }
    loadLibrary() {
        this.libraryService.getLibrary().subscribe({
            next: books => {
                this.library.set(books);
                this.loadRecommendations(books);
            },
        });
    }
    loadGoal() {
        this.goalService.getGoal().subscribe({
            next: goal => this.goal.set(goal),
        });
    }
    saveGoal() {
        if (this.newGoalTarget < 1)
            return;
        this.goalService.setGoal(this.newGoalTarget).subscribe({
            next: goal => {
                this.goal.set(goal);
                this.settingGoal.set(false);
            },
        });
    }
    loadRecommendations(books) {
        const authors = [...new Set(books.map(b => b.author).filter((a) => !!a && a.trim().length > 0))];
        if (authors.length === 0)
            return;
        this.recommendationsLoading.set(true);
        const libraryKeys = new Set(books.map(b => b.olId));
        const unique = new Map();
        let completed = 0;
        const toQuery = authors.slice(0, 3);
        for (const author of toQuery) {
            this.bookSearch.search(author, 10).pipe(catchError(() => of([]))).subscribe(results => {
                for (const book of results) {
                    if (!libraryKeys.has(book.key) && !unique.has(book.key)) {
                        unique.set(book.key, book);
                    }
                }
                completed++;
                if (completed === toQuery.length) {
                    this.recommendations.set([...unique.values()].slice(0, 10));
                    this.recommendationsLoading.set(false);
                }
            });
        }
    }
    addToLibrary(book) {
        this.addingBookKey.set(book.key);
        this.libraryService.addBook({
            olId: book.key,
            title: book.title,
            author: book.authors[0] ?? null,
            coverUrl: book.coverUrl,
            pageCount: book.pageCount,
            status: 'WANT_TO_READ',
            genre: book.genre,
        }).subscribe({
            next: added => {
                this.library.update(lib => [...lib, added]);
                this.addingBookKey.set(null);
            },
            error: err => {
                console.error('Nepavyko pridėti knygos:', err);
                alert(err?.error?.message ?? err?.message ?? 'Nepavyko pridėti knygos.');
                this.addingBookKey.set(null);
            },
        });
    }
    isInLibrary(book) {
        return this.library().some(b => b.olId === book.key);
    }
    onSearch() {
        const query = this.searchQuery.trim();
        if (!query)
            return;
        this.searchSubject.next(query);
    }
    onSearchKeydown(event) {
        if (event.key === 'Enter')
            this.onSearch();
    }
    clearSearch() {
        this.searchQuery = '';
        this.searchResults = [];
        this.hasSearched = false;
        this.errorMessage = '';
    }
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
};
Home = __decorate([
    Component({
        selector: 'app-home',
        imports: [CommonModule, FormsModule],
        templateUrl: './home.html',
        styleUrl: './home.scss',
    })
], Home);
export { Home };
