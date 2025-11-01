import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import ja from "./locales/ja.json"

export const LANGUAGE_STORAGE_KEY = "digloop.language"
const FALLBACK_LANGUAGE = "en"
const SUPPORTED_LANGUAGES = ["en", "ja"] as const

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const resources = {
	en: { translation: en },
	ja: { translation: ja },
} as const

const normalizeLanguage = (language: string | null | undefined): SupportedLanguage => {
	if (!language) {
		return FALLBACK_LANGUAGE
	}

	const exactMatch = SUPPORTED_LANGUAGES.find(
		(supported) => supported.toLowerCase() === language.toLowerCase(),
	)
	if (exactMatch) {
		return exactMatch
	}

	const base = language.split("-")[0]?.toLowerCase()
	const baseMatch = SUPPORTED_LANGUAGES.find((supported) => supported === base)

	return baseMatch ?? FALLBACK_LANGUAGE
}

const readStoredLanguage = (): SupportedLanguage | null => {
	if (typeof window === "undefined") {
		return null
	}

	try {
		const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
		if (!stored) {
			return null
		}

		return normalizeLanguage(stored)
	} catch (error) {
		console.warn("Unable to read language from localStorage", error)
		return null
	}
}

const detectBrowserLanguage = (): SupportedLanguage => {
	if (typeof window === "undefined") {
		return FALLBACK_LANGUAGE
	}

	const candidates = [
		window.navigator.language,
		...(window.navigator.languages ?? []),
	].filter(Boolean) as string[]

	for (const candidate of candidates) {
		const normalized = normalizeLanguage(candidate)
		if (normalized) {
			return normalized
		}
	}

	return FALLBACK_LANGUAGE
}

const getInitialLanguage = (): SupportedLanguage => {
	return readStoredLanguage() ?? detectBrowserLanguage()
}

const persistLanguage = (language: SupportedLanguage) => {
	if (typeof window === "undefined") {
		return
	}

	try {
		window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
	} catch (error) {
		console.warn("Unable to persist language preference", error)
	}
}

const updateDocumentLanguage = (language: SupportedLanguage) => {
	if (typeof document === "undefined") {
		return
	}

	document.documentElement.lang = language

	const metaDescription = document.querySelector("meta[name='description']")
	if (metaDescription) {
		metaDescription.setAttribute("content", i18n.t("meta.description"))
	}
}

const initialLanguage = getInitialLanguage()

const initPromise = i18n.use(initReactI18next).init({
	resources,
	fallbackLng: FALLBACK_LANGUAGE,
	lng: initialLanguage,
	supportedLngs: SUPPORTED_LANGUAGES,
	debug: false,
	interpolation: {
		escapeValue: false,
	},
})

void initPromise.then(() => {
	updateDocumentLanguage(normalizeLanguage(i18n.resolvedLanguage))
})

i18n.on("languageChanged", (nextLanguage: string) => {
	const normalized = normalizeLanguage(nextLanguage)
	persistLanguage(normalized)
	updateDocumentLanguage(normalized)
})

export const supportedLanguages = SUPPORTED_LANGUAGES

export default i18n
