import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
let LibraryService = class LibraryService {
    http = inject(HttpClient);
    baseUrl = 'http://localhost:10032/api/library';
    getLibrary() {
        return this.http.get(this.baseUrl);
    }
    filterLibrary(filters) {
        let params = new HttpParams();
        if (filters.title) {
            params = params.set('title', filters.title);
        }
        if (filters.author) {
            params = params.set('author', filters.author);
        }
        if (filters.progress !== undefined && filters.progress !== null) {
            params = params.set('progress', filters.progress.toString());
        }
        return this.http.get(`${this.baseUrl}/filter`, { params });
    }
    addBook(request) {
        return this.http.post(this.baseUrl, request);
    }
    uploadEpub(readingListId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.baseUrl}/${readingListId}/epub`, formData);
    }
    getEpubUrl(readingListId) {
        return `${this.baseUrl}/${readingListId}/epub`;
    }
    updateProgress(readingListId, currentPage) {
        return this.http.put(`${this.baseUrl}/${readingListId}/progress`, { currentPage });
    }
    removeBook(readingListId) {
        return this.http.delete(`${this.baseUrl}/${readingListId}`);
    }
};
LibraryService = __decorate([
    Injectable({ providedIn: 'root' })
], LibraryService);
export { LibraryService };
