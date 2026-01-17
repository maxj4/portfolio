import { Component, inject } from "@angular/core";
import { TranslationService } from "../../core/services/translation.service";


/**
 * Temporary test component.
 */
@Component({
    selector: 'app-test',
    template: `{{ translations().placeholder }} <button (click)="toggleLanguage()">Toggle Language</button>`,
})
export class TestComponent {
    private readonly translationService = inject(TranslationService);
    protected readonly translations = this.translationService.translations;

    toggleLanguage(): void {
        this.translationService.toggleLanguage();
    }
}   