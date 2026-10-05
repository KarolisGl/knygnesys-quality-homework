var EpubReaderComponent_1;
import { Component, Input, Output, EventEmitter, ViewChild, inject, NgZone, signal, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EpubStorageService } from '../../services/epub-storage.service';
import { LibraryService } from '../../services/library.service';
import { AuthService } from '../../services/auth.service';
import ePub from 'epubjs';
let EpubReaderComponent = class EpubReaderComponent {
    static { EpubReaderComponent_1 = this; }
    bookKey;
    title = '';
    readingListId;
    pageCount = null;
    close = new EventEmitter();
    progressChanged = new EventEmitter();
    viewerRef;
    epubStorage = inject(EpubStorageService);
    libraryService = inject(LibraryService);
    authService = inject(AuthService);
    zone = inject(NgZone);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    book = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rendition = null;
    blobUrl = null;
    keyHandler = this.onKeydown.bind(this);
    static SETTINGS_KEY_PREFIX = 'epub-reader-settings';
    static POSITION_KEY_PREFIX = 'epub-reader-position';
    totalEpubPages = 0;
    isLoading = signal(true);
    error = signal('');
    theme = signal(this.loadSettings().theme);
    fontSize = signal(this.loadSettings().fontSize);
    showSettings = signal(false);
    showToc = signal(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toc = signal([]);
    ngAfterViewInit() {
        document.addEventListener('keydown', this.keyHandler);
        this.loadEpub();
    }
    async loadEpub() {
        try {
            console.log('[EPUB] 1. Loading file from IndexedDB, key:', this.bookKey);
            const file = await this.epubStorage.load(this.bookKey);
            console.log('[EPUB] 2. File loaded:', file ? `${file.size} bytes` : 'NULL');
            if (!file) {
                this.zone.run(() => {
                    this.error.set('EPUB failas nerastas. Bandykite prisegti failą iš naujo.');
                    this.isLoading.set(false);
                });
                return;
            }
            console.log('[EPUB] 3. Converting to ArrayBuffer...');
            const arrayBuffer = await file.arrayBuffer();
            console.log('[EPUB] 4. ArrayBuffer size:', arrayBuffer.byteLength);
            console.log('[EPUB] 5. Creating ePub book...');
            this.book = ePub(arrayBuffer);
            console.log('[EPUB] 6. Waiting for book.ready...');
            await this.book.ready;
            console.log('[EPUB] 7. Book ready!');
            const el = this.viewerRef.nativeElement;
            console.log('[EPUB] 8. Viewer element:', el.tagName, 'size:', el.clientWidth, 'x', el.clientHeight);
            this.rendition = this.book.renderTo(el, {
                width: el.clientWidth || 600,
                height: el.clientHeight || 500,
            });
            console.log('[EPUB] 9. Rendition created, calling display()...');
            const savedCfi = this.loadPosition();
            await this.rendition.display(savedCfi || undefined);
            console.log('[EPUB] 10. Display complete!');
            this.applyTheme(this.theme());
            this.applyFontSize(this.fontSize());
            await this.book.locations.generate(1024);
            this.totalEpubPages = this.book.locations.length();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.rendition.on('relocated', (location) => {
                const cfi = location?.start?.cfi;
                if (cfi) {
                    this.savePosition(cfi);
                    this.syncProgress(location);
                }
            });
            const navigation = await this.book.loaded.navigation;
            this.zone.run(() => {
                this.toc.set(navigation.toc || []);
                this.isLoading.set(false);
            });
        }
        catch (err) {
            console.error('[EPUB] ERROR at some step:', err);
            this.zone.run(() => {
                this.error.set('Nepavyko atidaryti EPUB failo.');
                this.isLoading.set(false);
            });
        }
    }
    prevPage() {
        this.rendition?.prev();
    }
    nextPage() {
        this.rendition?.next();
    }
    toggleSettings() {
        this.showSettings.update(v => !v);
        if (this.showSettings())
            this.showToc.set(false);
    }
    toggleToc() {
        this.showToc.update(v => !v);
        if (this.showToc())
            this.showSettings.set(false);
    }
    goToChapter(href) {
        this.rendition?.display(href);
        this.showToc.set(false);
    }
    setTheme(theme) {
        this.theme.set(theme);
        this.applyTheme(theme);
        this.saveSettings();
    }
    changeFontSize(delta) {
        const next = Math.min(180, Math.max(60, this.fontSize() + delta));
        this.fontSize.set(next);
        this.applyFontSize(next);
        this.saveSettings();
    }
    applyTheme(theme) {
        if (!this.rendition)
            return;
        if (theme === 'dark') {
            this.rendition.themes.override('color', '#ccc');
            this.rendition.themes.override('background', '#1a1a2e');
        }
        else {
            this.rendition.themes.override('color', '#000');
            this.rendition.themes.override('background', '#fff');
        }
    }
    applyFontSize(size) {
        if (!this.rendition)
            return;
        this.rendition.themes.fontSize(`${size}%`);
    }
    onKeydown(e) {
        if (e.key === 'ArrowLeft')
            this.prevPage();
        else if (e.key === 'ArrowRight')
            this.nextPage();
        else if (e.key === 'Escape')
            this.zone.run(() => this.onClose());
    }
    get userPrefix() {
        return this.authService.currentUsername() ?? 'default';
    }
    get settingsKey() {
        return `${EpubReaderComponent_1.SETTINGS_KEY_PREFIX}-${this.userPrefix}`;
    }
    get positionKey() {
        return `${EpubReaderComponent_1.POSITION_KEY_PREFIX}-${this.userPrefix}-${this.bookKey}`;
    }
    loadSettings() {
        try {
            const raw = localStorage.getItem(this.settingsKey);
            if (raw)
                return JSON.parse(raw);
        }
        catch { /* ignore */ }
        return { theme: 'light', fontSize: 100 };
    }
    saveSettings() {
        localStorage.setItem(this.settingsKey, JSON.stringify({ theme: this.theme(), fontSize: this.fontSize() }));
    }
    loadPosition() {
        try {
            return localStorage.getItem(this.positionKey);
        }
        catch {
            return null;
        }
    }
    savePosition(cfi) {
        localStorage.setItem(this.positionKey, cfi);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    syncProgress(location) {
        if (this.totalEpubPages === 0)
            return;
        const epubPage = location.start?.location ?? 0;
        const realPage = this.pageCount
            ? Math.round((epubPage / this.totalEpubPages) * this.pageCount)
            : epubPage;
        this.progressChanged.emit(realPage);
        this.libraryService.updateProgress(this.readingListId, realPage).subscribe();
    }
    onClose() {
        this.close.emit();
    }
    ngOnDestroy() {
        document.removeEventListener('keydown', this.keyHandler);
        this.rendition?.destroy();
        this.book?.destroy();
        if (this.blobUrl)
            URL.revokeObjectURL(this.blobUrl);
    }
};
__decorate([
    Input()
], EpubReaderComponent.prototype, "bookKey", void 0);
__decorate([
    Input()
], EpubReaderComponent.prototype, "title", void 0);
__decorate([
    Input()
], EpubReaderComponent.prototype, "readingListId", void 0);
__decorate([
    Input()
], EpubReaderComponent.prototype, "pageCount", void 0);
__decorate([
    Output()
], EpubReaderComponent.prototype, "close", void 0);
__decorate([
    Output()
], EpubReaderComponent.prototype, "progressChanged", void 0);
__decorate([
    ViewChild('viewer')
], EpubReaderComponent.prototype, "viewerRef", void 0);
EpubReaderComponent = EpubReaderComponent_1 = __decorate([
    Component({
        selector: 'app-epub-reader',
        imports: [CommonModule],
        templateUrl: './epub-reader.component.html',
        styleUrl: './epub-reader.component.scss',
    })
], EpubReaderComponent);
export { EpubReaderComponent };
