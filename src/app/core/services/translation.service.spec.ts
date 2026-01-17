// src/app/core/services/translation.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import defaultTranslations from '../../../../public/i18n/de.json';

describe('TranslationService', () => {
    let service: TranslationService;
    let httpMock: HttpTestingController;
    let getItemSpy: MockInstance;
    let setItemSpy: MockInstance;

    const mockNavigator = (language: string) => {
        Object.defineProperty(window, 'navigator', {
            value: { language },
            writable: true
        });
    };

    const setup = (platformId: Object = 'browser') => {
        TestBed.configureTestingModule({
            providers: [
                TranslationService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: PLATFORM_ID, useValue: platformId }
            ]
        });

        service = TestBed.inject(TranslationService);
        httpMock = TestBed.inject(HttpTestingController);
    };

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
        setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

        // Reset navigator to default 'de' to avoid Http requests in basic tests
        mockNavigator('de-DE');
    });

    afterEach(() => {
        vi.restoreAllMocks(); // Restore all mocks including localStorage s
        httpMock.verify();
        TestBed.resetTestingModule();
    });

    describe('Initialization (Browser)', () => {
        it('should be created', () => {
            setup();
            expect(service).toBeTruthy();
        });

        it('should default to "de" if no storage or browser preference matches', () => {
            mockNavigator('fr-FR'); // Supported are 'en' and 'de'
            setup();

            expect(service.currentLanguage()).toBe('de');
            expect(service.translations()).toEqual(defaultTranslations);
        });

        it('should use browser language if supported ("en")', async () => {
            mockNavigator('en-US');
            setup();

            // Constructor triggers loadTranslations('en'), which calls HTTP
            expect(service.currentLanguage()).toBe('en');

            const req = httpMock.expectOne('/i18n/en.json');
            expect(req.request.method).toBe('GET');
            req.flush({ title: 'English Title' });

            // Wait for signal update because loadTranslations is async
            await vi.waitFor(() => {
                expect(service.translations()).toEqual({ title: 'English Title' });
            });
        });

        it('should use browser language if supported ("de")', () => {
            mockNavigator('de-DE');
            setup();

            expect(service.currentLanguage()).toBe('de');
            expect(service.translations()).toEqual(defaultTranslations);
            httpMock.expectNone('/i18n/de.json'); // 'de' is bundled
        });

        it('should use localStorage preference over browser language', () => {
            mockNavigator('en-US');
            getItemSpy.mockReturnValue('de'); // User preferred 'de' previously
            setup();

            expect(service.currentLanguage()).toBe('de');
            expect(service.translations()).toEqual(defaultTranslations);
        });
    });

    describe('Initialization (Server)', () => {
        it('should always default to "de" on server', () => {
            // Mock navigator to 'en' to prove it's ignored
            mockNavigator('en-US');
            setup('server'); // Pass 'server' as PLATFORM_ID

            expect(service.currentLanguage()).toBe('de');
            // Should not access localStorage
            expect(getItemSpy).not.toHaveBeenCalled();
        });
    });

    describe('Language Switching', () => {
        beforeEach(() => {
            mockNavigator('de-DE');
            setup();
        });

        it('setLanguage should update signal and localStorage', async () => {
            // Start with 'de'
            expect(service.currentLanguage()).toBe('de');

            // Switch to 'en'
            const setPromise = service.setLanguage('en');

            expect(service.isLoading()).toBe(true);

            const req = httpMock.expectOne('/i18n/en.json');
            req.flush({ hello: 'world' });

            await setPromise;

            expect(service.currentLanguage()).toBe('en');
            expect(service.translations()).toEqual({ hello: 'world' });
            expect(setItemSpy).toHaveBeenCalledWith('language', 'en');
            expect(service.isLoading()).toBe(false);
        });

        it('setLanguage should do nothing if language is same', async () => {
            await service.setLanguage('de');
            expect(setItemSpy).not.toHaveBeenCalled();
            httpMock.expectNone('/i18n/de.json');
        });

        it('toggleLanguage should switch between "de" and "en"', async () => {
            // de -> en
            const togglePromise1 = service.toggleLanguage();

            const req = httpMock.expectOne('/i18n/en.json');
            req.flush({ lang: 'en' });
            await togglePromise1;

            expect(service.currentLanguage()).toBe('en');

            // en -> de
            await service.toggleLanguage();
            expect(service.currentLanguage()).toBe('de');
            expect(service.translations()).toEqual(defaultTranslations);
        });
    });

    describe('Error Handling', () => {
        it('should fallback to default translations on HTTP error', async () => {
            mockNavigator('de-DE');
            setup();

            const promise = service.setLanguage('en');

            const req = httpMock.expectOne('/i18n/en.json');
            req.flush('Error', { status: 404, statusText: 'Not Found' });

            await promise;

            expect(service.translations()).toEqual(defaultTranslations); // Fallback
            // Current language might remain 'en' based on implementation, 
            // but translations should differ. 
            // Looking at code: `this._currentLanguage.set(lang);` happens BEFORE load.
            expect(service.currentLanguage()).toBe('en');
            expect(service.isLoading()).toBe(false);
        });
    });
});
