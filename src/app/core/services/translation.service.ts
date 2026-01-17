import { inject, Injectable, PLATFORM_ID, signal, Signal } from '@angular/core';

/**
 * Statically import german translations as default.
 * This is bundled with the app and ensures that there is always a fallback language available.
 * Other languages (for now only English) are loaded dynamically via HTTP requests.
 */
import defaultTranslations from '../../../../public/i18n/de.json';
import { HttpClient } from '@angular/common/http';
import { Language, SUPPORTED_LANGUAGES, Translations } from '../models/translation.model';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class TranslationService {
    // Dependencies
    private readonly http = inject(HttpClient);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    // State Signals
    private readonly _currentLanguage = signal<Language>(this.getInitialLanguage());
    private readonly _translations = signal<Translations>(defaultTranslations);
    private readonly _isLoading = signal<boolean>(false);

    // Exposed Signals
    readonly currentLanguage = this._currentLanguage.asReadonly();
    readonly translations = this._translations.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();

    constructor() {
        this.loadTranslations(this._currentLanguage());
    }

    /**
     * Change the current language and load corresponding translations.
     * If changed, the new language is stored in localStorage (if in browser).
     */
    async setLanguage(lang: Language): Promise<void> {
        if (lang === this._currentLanguage()) {
            return;
        }

        this._currentLanguage.set(lang);

        if (this.isBrowser) {
            localStorage.setItem('language', lang);
        }

        await this.loadTranslations(lang);
    }

    /**
     * Toggle between 'de' and 'en' languages.
     */
    async toggleLanguage(): Promise<void> {
        const newLang: Language = this._currentLanguage() === 'de' ? 'en' : 'de';
        await this.setLanguage(newLang);
    }

    /**
     * Set the current language and load corresponding translations.
     * German is bundled; English is loaded via HTTP.
     */
    private async loadTranslations(lang: Language): Promise<void> {
        if (lang === 'de') {
            this._translations.set(defaultTranslations);
            return;
        }

        this._isLoading.set(true);

        try {
            const translations = await firstValueFrom(this.http.get<Translations>(`/i18n/${lang}.json`));
            this._translations.set(translations);
        } catch (error) {
            console.error(`Error loading translations for language '${lang}':`, error);
            // Fallback to default translations in case of error
            this._translations.set(defaultTranslations);
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Get the initial language for the application.
     * It is determined by:
     * 1. User preference stored in localStorage
     * 2. Browser language settings
     * 3. Fallback to 'de' (German) 
     */
    private getInitialLanguage(): Language {
        if (!this.isBrowser) {
            return 'de'; // Default to German on the server side
        }

        const stored = localStorage.getItem('language') as Language | null;
        if (stored) {
            return stored;
        }

        const browserLang = navigator.language.slice(0, 2) as Language;
        if (SUPPORTED_LANGUAGES.includes(browserLang)) {
            return browserLang;
        }

        return 'de';
    }
}