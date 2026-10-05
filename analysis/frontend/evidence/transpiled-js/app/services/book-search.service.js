import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, of } from 'rxjs';
let BookSearchService = class BookSearchService {
    http = inject(HttpClient);
    searchUrl = 'https://openlibrary.org/search.json';
    coverUrl = 'https://covers.openlibrary.org/b/id';
    cache = new Map();
    search(query, limit = 10) {
        const cacheKey = `${query.toLowerCase()}:${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return of(cached);
        }
        const params = new HttpParams()
            .set('q', query)
            .set('limit', limit)
            .set('fields', 'key,title,author_key,author_name,cover_i,first_publish_year,number_of_pages_median,subject');
        return this.http.get(this.searchUrl, { params }).pipe(map(res => {
            const results = res.docs.map(doc => ({
                key: doc.key,
                title: doc.title,
                authors: doc.author_name ?? [],
                coverUrl: doc.cover_i ? `${this.coverUrl}/${doc.cover_i}-M.jpg` : null,
                firstPublishYear: doc.first_publish_year ?? null,
                pageCount: doc.number_of_pages_median ?? null,
                genre: this.extractGenre(doc.subject),
            }));
            this.cache.set(cacheKey, results);
            return results;
        }));
    }
    extractGenre(subjects) {
        if (!subjects || subjects.length === 0)
            return null;
        // Skip generic/technical OL metadata tags and pick the first meaningful subject
        const skip = new Set(['accessible book', 'protected daisy', 'in library', 'overdrive', 'internet archive']);
        const genre = subjects.find(s => !skip.has(s.toLowerCase()));
        return genre ?? null;
    }
};
BookSearchService = __decorate([
    Injectable({ providedIn: 'root' })
], BookSearchService);
export { BookSearchService };
