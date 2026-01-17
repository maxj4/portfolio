/**
 * Type-safe translation interface.
 * This ensures compile-time safety when accessing translation keys.
 */
export interface Translations {
    placeholder: string;
}

/**
 * Supported languages in the application.
 * This is defined as a constant array to leverage TypeScript's type inference.
 * 
 * This will throw a compile-time error if a language code is used that is not supported.
 */
export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

























