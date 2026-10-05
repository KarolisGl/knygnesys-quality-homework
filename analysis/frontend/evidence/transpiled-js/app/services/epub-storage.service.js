import { Injectable } from '@angular/core';
let EpubStorageService = class EpubStorageService {
    DB_NAME = 'knygnesys-epub';
    STORE_NAME = 'epubs';
    db = null;
    openDb() {
        if (this.db)
            return Promise.resolve(this.db);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);
            request.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
            };
            request.onsuccess = e => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async save(key, file) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            tx.objectStore(this.STORE_NAME).put(file, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async load(key) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readonly');
            const req = tx.objectStore(this.STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    }
    async getAllKeys() {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readonly');
            const req = tx.objectStore(this.STORE_NAME).getAllKeys();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    async remove(key) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            tx.objectStore(this.STORE_NAME).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
};
EpubStorageService = __decorate([
    Injectable({ providedIn: 'root' })
], EpubStorageService);
export { EpubStorageService };
