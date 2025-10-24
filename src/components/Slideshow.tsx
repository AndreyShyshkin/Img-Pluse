'use client'

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface SlideshowProps {
	images: File[]
	processedImages: ProcessedImage[]
}

const Slideshow: React.FC<SlideshowProps> = ({ images, processedImages }) => {
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [nextIndex, setNextIndex] = useState(0)
	const [isTransitioning, setIsTransitioning] = useState(false)
	const [delay, setDelay] = useState(2000)
	const [transition, setTransition] = useState<'fade' | 'slide' | 'none'>(
		'fade'
	)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [isExporting, setIsExporting] = useState(false)
	const [exportProgress, setExportProgress] = useState(0)
	const intervalRef = useRef<NodeJS.Timeout | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const ffmpegRef = useRef<FFmpeg | null>(null)
	const [ffmpegLoaded, setFfmpegLoaded] = useState(false)

	const imagesToShow =
		processedImages.length > 0
			? processedImages
			: images.map(file => ({
					file,
					originalSize: file.size,
					url: URL.createObjectURL(file),
			  }))

	const goToNext = useCallback(() => {
		if (isTransitioning) return
		setIsTransitioning(true)
		setNextIndex(prev => (prev + 1) % imagesToShow.length)
		setTimeout(
			() => {
				setCurrentIndex(prev => (prev + 1) % imagesToShow.length)
				setIsTransitioning(false)
			},
			transition === 'none' ? 0 : 500
		)
	}, [imagesToShow.length, isTransitioning, transition])

	const goToPrevious = useCallback(() => {
		if (isTransitioning) return
		setIsTransitioning(true)
		setNextIndex(prev => (prev === 0 ? imagesToShow.length - 1 : prev - 1))
		setTimeout(
			() => {
				setCurrentIndex(prev =>
					prev === 0 ? imagesToShow.length - 1 : prev - 1
				)
				setIsTransitioning(false)
			},
			transition === 'none' ? 0 : 500
		)
	}, [imagesToShow.length, isTransitioning, transition])

	const goToSlide = useCallback(
		(index: number) => {
			if (isTransitioning) return
			setIsTransitioning(true)
			setNextIndex(index)
			setTimeout(
				() => {
					setCurrentIndex(index)
					setIsTransitioning(false)
				},
				transition === 'none' ? 0 : 500
			)
		},
		[isTransitioning, transition]
	)

	const togglePlay = useCallback(() => {
		setIsPlaying(prev => !prev)
	}, [])

	const loadFFmpeg = useCallback(async () => {
		if (ffmpegLoaded || ffmpegRef.current) return
		try {
			const ffmpeg = new FFmpeg()
			ffmpegRef.current = ffmpeg

			const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
			await ffmpeg.load({
				coreURL: await toBlobURL(
					`${baseURL}/ffmpeg-core.js`,
					'text/javascript'
				),
				wasmURL: await toBlobURL(
					`${baseURL}/ffmpeg-core.wasm`,
					'application/wasm'
				),
			})

			setFfmpegLoaded(true)
		} catch (error) {
			console.error('Error loading FFmpeg:', error)
		}
	}, [ffmpegLoaded])

	const exportToVideo = useCallback(async () => {
		setIsExporting(true)
		setExportProgress(0)

		try {
			// Load FFmpeg if not loaded
			if (!ffmpegLoaded) {
				await loadFFmpeg()
			}

			if (!ffmpegRef.current) {
				alert('Помилка ініціалізації FFmpeg')
				setIsExporting(false)
				return
			}

			const ffmpeg = ffmpegRef.current

			// Create canvas for rendering
			const canvas = document.createElement('canvas')
			canvas.width = 1920
			canvas.height = 1080
			const ctx = canvas.getContext('2d')!

			// Generate frames
			setExportProgress(10)

			// Create frames
			for (let slideIndex = 0; slideIndex < imagesToShow.length; slideIndex++) {
				const img = imagesToShow[slideIndex]
				const image = await new Promise<HTMLImageElement>((resolve, reject) => {
					const loadedImage = new Image()
					loadedImage.onload = () => resolve(loadedImage)
					loadedImage.onerror = reject
					loadedImage.src = img.url || ''
				})

				// Clear and fill background
				ctx.fillStyle = '#000000'
				ctx.fillRect(0, 0, canvas.width, canvas.height)

				// Calculate dimensions to fit image
				const scale = Math.min(
					canvas.width / image.width,
					canvas.height / image.height
				)
				const x = (canvas.width - image.width * scale) / 2
				const y = (canvas.height - image.height * scale) / 2

				ctx.drawImage(image, x, y, image.width * scale, image.height * scale)

				// Save frame
				const blob = await new Promise<Blob>((resolve, reject) => {
					canvas.toBlob(
						blob =>
							blob ? resolve(blob) : reject(new Error('Failed to create blob')),
						'image/png'
					)
				})

				const frameData = await fetchFile(blob)
				await ffmpeg.writeFile(
					`frame${slideIndex.toString().padStart(4, '0')}.png`,
					frameData
				)

				setExportProgress(10 + (slideIndex / imagesToShow.length) * 40)
			}

			setExportProgress(50)

			// Create video from frames
			await ffmpeg.exec([
				'-framerate',
				'1',
				'-i',
				'frame%04d.png',
				'-c:v',
				'libx264',
				'-pix_fmt',
				'yuv420p',
				'-preset',
				'medium',
				'-crf',
				'23',
				'output.mp4',
			])

			setExportProgress(90)

			// Read the output
			const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const blob = new Blob([data as any], {
				type: 'video/mp4',
			})
			const url = URL.createObjectURL(blob)

			// Download
			const a = document.createElement('a')
			a.href = url
			a.download = `slideshow-${Date.now()}.mp4`
			a.click()
			URL.revokeObjectURL(url)

			setExportProgress(100)
			setIsExporting(false)
		} catch (error) {
			console.error('Error exporting video:', error)
			alert('Помилка при експорті відео: ' + (error as Error).message)
			setIsExporting(false)
		}
	}, [imagesToShow, ffmpegLoaded, loadFFmpeg])

	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement && containerRef.current) {
			containerRef.current.requestFullscreen()
			setIsFullscreen(true)
		} else if (document.exitFullscreen) {
			document.exitFullscreen()
			setIsFullscreen(false)
		}
	}, [])

	useEffect(() => {
		if (isPlaying && imagesToShow.length > 1) {
			intervalRef.current = setInterval(goToNext, delay)
		} else if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
			}
		}
	}, [isPlaying, delay, goToNext, imagesToShow.length])

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement)
		}

		document.addEventListener('fullscreenchange', handleFullscreenChange)
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange)
		}
	}, [])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight') goToNext()
			else if (e.key === 'ArrowLeft') goToPrevious()
			else if (e.key === ' ') {
				e.preventDefault()
				togglePlay()
			} else if (e.key === 'Escape' && isFullscreen) {
				document.exitFullscreen()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [goToNext, goToPrevious, togglePlay, isFullscreen])

	if (imagesToShow.length === 0) {
		return (
			<div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center'>
				<div className='text-4xl mb-3'>🎬</div>
				<p className='text-gray-600 dark:text-gray-300'>
					Завантажте зображення для створення слайд-шоу
				</p>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			<div className='bg-green-50 dark:bg-green-900/20 rounded-lg p-4'>
				<h3 className='text-lg font-semibold mb-3 text-gray-800 dark:text-white'>
					🎬 Слайд-шоу
				</h3>

				<div
					ref={containerRef}
					className={`relative bg-black rounded-lg overflow-hidden ${
						isFullscreen ? 'h-screen' : 'aspect-video'
					}`}
				>
					<div className='w-full h-full flex items-center justify-center relative'>
						{transition === 'fade' && (
							<>
								{/* Previous image fading out */}
								{isTransitioning && currentIndex !== nextIndex && (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={imagesToShow[currentIndex]?.url || ''}
										alt={imagesToShow[currentIndex]?.file?.name || 'Slide'}
										className='max-w-full max-h-full object-contain absolute inset-0 m-auto transition-opacity duration-500'
										style={{ opacity: 0 }}
										key={`fade-out-${currentIndex}`}
									/>
								)}
								{/* Current/Next image fading in */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={
										imagesToShow[isTransitioning ? nextIndex : currentIndex]
											?.url || ''
									}
									alt={
										imagesToShow[isTransitioning ? nextIndex : currentIndex]
											?.file?.name || 'Slide'
									}
									className='max-w-full max-h-full object-contain absolute inset-0 m-auto transition-opacity duration-500'
									style={{ opacity: 1 }}
									key={`fade-in-${isTransitioning ? nextIndex : currentIndex}`}
								/>
							</>
						)}
						{transition === 'slide' && (
							<div className='w-full h-full overflow-hidden relative'>
								{/* Previous image sliding out */}
								{isTransitioning && currentIndex !== nextIndex && (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={imagesToShow[currentIndex]?.url || ''}
										alt={imagesToShow[currentIndex]?.file?.name || 'Slide'}
										className='max-w-full max-h-full object-contain absolute inset-0 m-auto transition-transform duration-500'
										style={{
											transform:
												nextIndex > currentIndex
													? 'translateX(-100%)'
													: 'translateX(100%)',
										}}
										key={`slide-out-${currentIndex}`}
									/>
								)}
								{/* Current/Next image sliding in */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={
										imagesToShow[isTransitioning ? nextIndex : currentIndex]
											?.url || ''
									}
									alt={
										imagesToShow[isTransitioning ? nextIndex : currentIndex]
											?.file?.name || 'Slide'
									}
									className='max-w-full max-h-full object-contain absolute inset-0 m-auto transition-transform duration-500'
									style={{
										transform: 'translateX(0)',
									}}
									key={`slide-in-${isTransitioning ? nextIndex : currentIndex}`}
								/>
							</div>
						)}
						{transition === 'none' && (
							<>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={imagesToShow[currentIndex]?.url || ''}
									alt={imagesToShow[currentIndex]?.file?.name || 'Slide'}
									className='max-w-full max-h-full object-contain'
									key={`none-${currentIndex}`}
								/>
							</>
						)}
					</div>

					{/* Controls Overlay */}
					<div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300'>
						{/* Top bar */}
						<div className='absolute top-0 left-0 right-0 p-4 flex justify-between items-center'>
							<div className='text-white text-sm'>
								{currentIndex + 1} / {imagesToShow.length}
							</div>
							<button
								onClick={toggleFullscreen}
								className='text-white hover:text-green-400 transition-colors text-2xl'
								title='Повноекранний режим'
							>
								{isFullscreen ? '🗗' : '⛶'}
							</button>
						</div>

						{/* Center controls */}
						<div className='absolute inset-0 flex items-center justify-between px-4'>
							<button
								onClick={goToPrevious}
								className='text-white hover:text-green-400 transition-colors text-4xl bg-black/30 rounded-full w-12 h-12 flex items-center justify-center'
								title='Попереднє (←)'
							>
								◀
							</button>
							<button
								onClick={togglePlay}
								className='text-white hover:text-green-400 transition-colors text-5xl bg-black/30 rounded-full w-16 h-16 flex items-center justify-center'
								title={isPlaying ? 'Пауза (Space)' : 'Відтворити (Space)'}
							>
								{isPlaying ? '⏸' : '▶'}
							</button>
							<button
								onClick={goToNext}
								className='text-white hover:text-green-400 transition-colors text-4xl bg-black/30 rounded-full w-12 h-12 flex items-center justify-center'
								title='Наступне (→)'
							>
								▶
							</button>
						</div>

						{/* Bottom info */}
						<div className='absolute bottom-0 left-0 right-0 p-4'>
							<div className='text-white text-center text-sm mb-2'>
								{imagesToShow[currentIndex]?.file?.name}
							</div>
						</div>
					</div>
				</div>

				{/* Thumbnails */}
				<div className='mt-4 overflow-x-auto'>
					<div className='flex space-x-2 pb-2'>
						{imagesToShow.map((img, index) => (
							<button
								key={index}
								onClick={() => goToSlide(index)}
								className={`flex-shrink-0 rounded-lg overflow-hidden border-4 transition-all ${
									index === currentIndex
										? 'border-green-500 scale-110'
										: 'border-gray-300 dark:border-gray-600 hover:border-green-300'
								}`}
							>
								<div className='w-20 h-20 bg-gray-100 dark:bg-gray-700'>
									{img.url ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={img.url}
											alt={img.file?.name || `Slide ${index + 1}`}
											className='w-full h-full object-cover'
										/>
									) : null}
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Settings */}
				<div className='mt-4 space-y-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Затримка між слайдами: {delay / 1000} сек
						</label>
						<input
							type='range'
							min='500'
							max='10000'
							step='500'
							value={delay}
							onChange={e => setDelay(Number(e.target.value))}
							className='w-full'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Ефект переходу
						</label>
						<div className='flex space-x-3'>
							<button
								onClick={() => setTransition('fade')}
								className={`flex-1 py-2 rounded-lg border-2 transition-all text-sm ${
									transition === 'fade'
										? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
										: 'border-gray-300 dark:border-gray-600 hover:border-green-300'
								}`}
							>
								Затухання
							</button>
							<button
								onClick={() => setTransition('slide')}
								className={`flex-1 py-2 rounded-lg border-2 transition-all text-sm ${
									transition === 'slide'
										? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
										: 'border-gray-300 dark:border-gray-600 hover:border-green-300'
								}`}
							>
								Ковзання
							</button>
							<button
								onClick={() => setTransition('none')}
								className={`flex-1 py-2 rounded-lg border-2 transition-all text-sm ${
									transition === 'none'
										? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
										: 'border-gray-300 dark:border-gray-600 hover:border-green-300'
								}`}
							>
								Без переходу
							</button>
						</div>
					</div>

					<div className='flex items-center justify-center space-x-4 pt-2'>
						<button
							onClick={togglePlay}
							className={`px-6 py-3 rounded-lg font-medium transition-colors ${
								isPlaying
									? 'bg-orange-500 hover:bg-orange-600 text-white'
									: 'bg-green-500 hover:bg-green-600 text-white'
							}`}
						>
							{isPlaying ? '⏸ Пауза' : '▶ Відтворити'}
						</button>
						<button
							onClick={exportToVideo}
							disabled={isExporting}
							className='px-6 py-3 rounded-lg font-medium transition-colors bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white'
						>
							{isExporting
								? `⏳ Експорт... ${exportProgress}%`
								: '🎥 Завантажити MP4'}
						</button>
					</div>
					{isExporting && (
						<div className='mt-3'>
							<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5'>
								<div
									className='bg-blue-600 h-2.5 rounded-full transition-all duration-300'
									style={{ width: `${exportProgress}%` }}
								></div>
							</div>
							<div className='text-center text-sm text-gray-600 dark:text-gray-400 mt-1'>
								{exportProgress < 50
									? 'Генерація кадрів...'
									: exportProgress < 90
									? 'Конвертація в MP4...'
									: 'Завершення...'}
							</div>
						</div>
					)}
					<div className='text-center text-sm text-gray-600 dark:text-gray-400 mt-2'>
						Використовуйте ← → Space Esc
					</div>
				</div>
			</div>
		</div>
	)
}

export default Slideshow
