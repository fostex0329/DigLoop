import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supportedLanguages } from "@/i18n"
import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

type LanguageOption = {
	code: (typeof supportedLanguages)[number]
	flag: string
	shorthand: string
	labelKey: string
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
	{ code: "en", flag: "🇬🇧", shorthand: "EN", labelKey: "language.english" },
	{ code: "ja", flag: "🇯🇵", shorthand: "JA", labelKey: "language.japanese" },
]

export function LanguageSelector() {
	const { i18n, t } = useTranslation()

	const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language
	const currentLanguage =
		supportedLanguages.find(
			(language) => resolvedLanguage?.toLowerCase().startsWith(language),
		) ?? supportedLanguages[0]

	const handleLanguageChange = (value: string) => {
		if (!value || value === currentLanguage) {
			return
		}

		void i18n.changeLanguage(value)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="icon" variant="ghost" className="">
					<Globe className="h-5 w-5" />
					<span className="sr-only">{t("language.select")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36">
				<DropdownMenuRadioGroup
					value={currentLanguage}
					onValueChange={handleLanguageChange}
				>
					{LANGUAGE_OPTIONS.filter((option) =>
						supportedLanguages.includes(option.code),
					).map((option) => (
						<DropdownMenuRadioItem
							key={option.code}
							value={option.code}
							className="flex items-center justify-between gap-2 text-sm transition data-[state=checked]:bg-[#00FF9C]/20 data-[state=checked]:font-semibold data-[state=checked]:text-[#00FF9C]"
						>
							<span className="flex items-center gap-2">
								<span aria-hidden>{option.flag}</span>
								<span>{option.shorthand}</span>
							</span>
							{/* <span className="text-xs text-muted-foreground data-[state=checked]:text-inherit">
								{t(option.labelKey)}
							</span> */}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
