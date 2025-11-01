import { useState, type FormEvent } from "react"
import { useRoutes } from "react-router-dom"
import { Loader2, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SiteHeader } from "@/components/site-header"

import LetterGlitch from "./components/LetterGlitch"
import { Icons } from "./components/icons"
import {
	InputGroup,
	InputGroupButton,
	InputGroupInput,
} from "./components/ui/input-group"
import { TailwindIndicator } from "./components/tailwind-indicator"
import { Button } from "./components/ui/button"

type LastfmArtistImage = {
	size: "small" | "medium" | "large" | "extralarge" | "mega"
	"#text": string
}

type LastfmArtist = {
	name: string
	match?: string
	url?: string
	image?: LastfmArtistImage[]
	streamable?: string
}

type LastfmSimilarResponse = {
	similarartists?: {
		artist?: LastfmArtist[]
	}
	error?: number
	message?: string
}

type LastfmAlbum = {
	image?: LastfmArtistImage[]
	name: string
	"@attr"?: {
		rank?: string
	}
}

type LastfmTopAlbumsResponse = {
	topalbums?: {
		album?: LastfmAlbum[]
	}
	error?: number
	message?: string
}

type SimilarArtist = LastfmArtist & {
	imageUrl?: string | null
}

type TranslationError = {
	key: string
	options?: Record<string, unknown>
}

const lastfmApiKey = import.meta.env.VITE_LASTFM_API_KEY?.trim()
const LASTFM_PLACEHOLDER_HASH = "2a96cbd8b46e442fc41c2b86b821562f"

function isPlaceholderImage(url: string | undefined | null): boolean {
	if (!url) {
		return true
	}
	const normalized = url.trim().toLowerCase()
	return (
		normalized.length === 0 ||
		normalized.includes(LASTFM_PLACEHOLDER_HASH) ||
		normalized.endsWith("/nofify/") ||
		normalized.endsWith("/noimage.png")
	)
}

async function fetchSimilarArtists(
	artistName: string,
): Promise<LastfmArtist[]> {
	if (!lastfmApiKey) {
		throw new Error("errors.apiKeyMissing")
	}

	const params = new URLSearchParams({
		method: "artist.getsimilar",
		artist: artistName,
		api_key: lastfmApiKey,
		format: "json",
		limit: "12",
	})

	const response = await fetch(
		`https://ws.audioscrobbler.com/2.0/?${params.toString()}`,
	)

	if (!response.ok) {
		throw new Error("errors.apiFailure")
	}

	const data = (await response.json()) as LastfmSimilarResponse

	if (data.error) {
		throw new Error("errors.apiFailure")
	}

	return data.similarartists?.artist ?? []
}

async function fetchTopAlbumImage(artistName: string): Promise<string | null> {
	if (!lastfmApiKey) {
		throw new Error("errors.apiKeyMissing")
	}

	const params = new URLSearchParams({
		method: "artist.gettopalbums",
		artist: artistName,
		api_key: lastfmApiKey,
		format: "json",
		limit: "5",
	})

	const response = await fetch(
		`https://ws.audioscrobbler.com/2.0/?${params.toString()}`,
	)

	if (!response.ok) {
		throw new Error("errors.apiFailure")
	}

	const data = (await response.json()) as LastfmTopAlbumsResponse

	if (data.error) {
		throw new Error("errors.apiFailure")
	}

	const albums = data.topalbums?.album ?? []
	const primaryAlbum =
		albums.find((album) => album["@attr"]?.rank === "1") ?? albums[0]

	if (!primaryAlbum?.image?.length) {
		return null
	}

	const preferredOrder: LastfmArtistImage["size"][] = [
		"extralarge",
		"mega",
		"large",
		"medium",
		"small",
	]

	for (const size of preferredOrder) {
		const match = primaryAlbum.image.find((img) => img.size === size)
		if (match?.["#text"]?.trim()) {
			return match["#text"]
		}
	}

	const fallback = primaryAlbum.image.find((img) => img["#text"]?.trim())
	return fallback?.["#text"] ?? null
}

const routes = [{ path: "/", element: <Home /> }]

function Home() {
	const { t } = useTranslation()
	const [query, setQuery] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<TranslationError | null>(null)
	const [relatedArtists, setRelatedArtists] = useState<SimilarArtist[]>([])
	const [hasSearched, setHasSearched] = useState(false)

	const executeSearch = async (rawArtistName: string) => {
		const trimmedQuery = rawArtistName.trim()

		if (!trimmedQuery) {
			setError({ key: "errors.emptyQuery" })
			setRelatedArtists([])
			setHasSearched(false)
			return
		}

		setLoading(true)
		setError(null)
		setHasSearched(true)

		try {
			const related = await fetchSimilarArtists(trimmedQuery)

			const artistsWithImages = await Promise.all(
				related.map(async (artist) => {
					const existingImageCandidates = [
						artist.image?.find((img) => img.size === "extralarge")?.["#text"],
						artist.image?.find((img) => img.size === "large")?.["#text"],
						artist.image?.find((img) => img.size === "medium")?.["#text"],
						artist.image?.[0]?.["#text"],
					]

					const existingImage = existingImageCandidates.find(
						(url) => !isPlaceholderImage(url),
					)

					if (existingImage?.trim()) {
						return { ...artist, imageUrl: existingImage.trim() }
					}

					const albumImage = await fetchTopAlbumImage(artist.name).catch(
						() => null,
					)

					return { ...artist, imageUrl: albumImage?.trim() ?? null }
				}),
			)

			setRelatedArtists(artistsWithImages)

			if (artistsWithImages.length === 0) {
				setError({ key: "errors.noResults" })
			}
		} catch (err) {
			console.error(err)
			if (err instanceof Error && err.message.startsWith("errors.")) {
				setError({ key: err.message })
			} else {
				setError({ key: "errors.unknown" })
			}
			setRelatedArtists([])
		} finally {
			setLoading(false)
		}
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		await executeSearch(query)
	}

	const handleRelatedArtistSearch = (artistName: string) => {
		setQuery(artistName)
		void executeSearch(artistName)
	}

	return (
		<section className="container flex justify-center gap-8 pb-8 pt-6 md:py-10">
			<div className="flex max-w-4xl flex-col gap-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
						{t("home.title")}
					</h1>
					<p className="whitespace-pre-line text-lg text-muted-foreground md:text-xl">
						{t("home.subtitle")}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="w-full space-y-2">
					<InputGroup className="h-16 rounded-full border-white/20 bg-white/10 pl-4 pr-2 backdrop-blur-sm hover:bg-transparent">
						<InputGroupButton
							disabled={loading}
							type="submit"
							className="rounded-full"
						>
							{loading ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									{t("search.buttonLoading")}
								</>
							) : (
								<>
									{/* <Button
										variant="ghost"
										size="icon"
										className="hover:bg-transparent"
									>
										<Search className="" />
										<span className="sr-only">{t("search.buttonLabel")}</span>
									</Button> */}
									<Search className="h-12 w-12 rounded-full text-muted-foreground" />
								</>
							)}
						</InputGroupButton>
						<InputGroupInput
							autoComplete="on"
							aria-label={t("search.inputLabel")}
							placeholder={t("search.placeholder")}
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
						/>
					</InputGroup>
					<p className="text-sm text-muted-foreground">
						{/* 手元の環境で`.env`に設定したAPIキー（`VITE_LASTFM_API_KEY`）が使われます。 */}
					</p>
				</form>

				{error ? (
					<p className="text-sm font-medium text-red-400">
						{t(error.key, error.options)}
					</p>
				) : null}

				{hasSearched && !loading && !error && relatedArtists.length > 0 ? (
					<div className="space-y-4">
						<div className="grid-1 grid gap-3">
							{relatedArtists.map((artist) => {
								const resolvedMatch = Number(artist.match)
								const imageCandidates = [
									artist.imageUrl,
									artist.image?.find((img) => img.size === "extralarge")?.[
										"#text"
									],
									artist.image?.find((img) => img.size === "large")?.["#text"],
									artist.image?.find((img) => img.size === "medium")?.["#text"],
									artist.image?.[0]?.["#text"],
								]

								const imageUrl =
									imageCandidates
										.find((url) => !isPlaceholderImage(url))
										?.trim() ?? null

								const similarity = !Number.isNaN(resolvedMatch)
									? t("search.match", {
											match: Math.round(resolvedMatch * 100),
										})
									: null

								const cardContent = (
									<>
										{imageUrl?.length ? (
											<img
												alt={t("search.artistImageAlt", {
													name: artist.name,
												})}
												className="size-14 flex-shrink-0 rounded object-cover"
												height={56}
												src={imageUrl}
												width={56}
											/>
										) : (
											<div className="flex size-14 flex-shrink-0 items-center justify-center rounded bg-white/10 pl-2 text-sm text-muted-foreground backdrop-blur-sm">
												{t("search.noImage")}
											</div>
										)}

										<div className="space-y-1">
											<p className="font-medium text-white">{artist.name}</p>
											{similarity ? (
												<p className="text-xs uppercase tracking-wide text-muted-foreground">
													{similarity}
												</p>
											) : null}
										</div>
									</>
								)

								return (
									<div
										key={artist.name}
										className="flex items-center gap-3 rounded-2xl border border-white/10  bg-white/10 p-3 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10"
									>
										{artist.url ? (
											<a
												className="flex flex-1 items-center gap-3"
												href={artist.url}
												rel="noreferrer"
												target="_blank"
											>
												{cardContent}
											</a>
										) : (
											<div className="flex flex-1 items-center gap-3">
												{cardContent}
											</div>
										)}

										<button
											type="button"
											onClick={() => handleRelatedArtistSearch(artist.name)}
											className="group ml-2 inline-flex h-11 items-center overflow-hidden rounded-full border border-white/20 bg-white/10 px-3 text-white transition-all hover:gap-2 hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
										>
											<span className="sr-only">
												{t("search.searchArtist", { name: artist.name })}
											</span>
											<Icons.shovel className="size-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
											<span className="max-w-0 translate-x-2 text-nowrap text-xs font-medium tracking-wide text-white/90 opacity-0 transition-all duration-300 ease-out group-hover:max-w-[120px] group-hover:translate-x-0 group-hover:opacity-100">
												{t("search.digMore")}
											</span>
										</button>
									</div>
								)
							})}
						</div>
					</div>
				) : null}
			</div>
		</section>
	)
}

function App() {
	const children = useRoutes(routes)

	return (
		<div className="relative h-screen w-full overflow-hidden bg-black">
			{/* 背景レイヤー */}
			<LetterGlitch
				glitchSpeed={35}
				outerVignette={true}
				centerVignette={true}
				smooth={true}
				className="opacity-45"
				glitchColors={["#2b4539", "#61dca3", "#61b3dc"]}
				characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789"
			/>

			{/* コンテンツレイヤー */}
			<div className="absolute inset-0 z-10 flex flex-col">
				<SiteHeader />
				<div className="flex-1 overflow-y-auto">{children}</div>
				<TailwindIndicator />
			</div>
		</div>
	)
}

export default App
