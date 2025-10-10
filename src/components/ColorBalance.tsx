'use client'

import { useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface ColorBalanceProps {
	images: File[]
	processedImages: ProcessedImage[]
	onProcess: (images: ProcessedImage[]) => void
	isProcessing: boolean
	setIsProcessing: (processing: boolean) => void
}

const ColorBalance: React.FC<ColorBalanceProps> = ({
	images,
	processedImages: existingProcessedImages,
	onProcess,
	isProcessing,
	setIsProcessing,
}) => {
	const [redAdjustment, setRedAdjustment] = useState(0)
	const [greenAdjustment, setGreenAdjustment] = useState(0)
	const [blueAdjustment, setBlueAdjustment] = useState(0)
	const [brightness, setBrightness] = useState(0)
	const [contrast, setContrast] = useState(0)
	const [saturation, setSaturation] = useState(0)
	const [opacity, setOpacity] = useState(100)

	const adjustImages = async () => {
		if (images.length === 0) return

		setIsProcessing(true)
		const processedImages: ProcessedImage[] = []

		for (const file of images) {
			try {
				const existingProcessedImage = existingProcessedImages?.find(
					p => p.file === file
				)

				const targetMimeType =
					existingProcessedImage?.mimeType || file.type || 'image/png'
				const targetQuality =
					existingProcessedImage?.quality ||
					(file.type === 'image/jpeg' ? 0.9 : undefined)

				const canvas = document.createElement('canvas')
				const ctx = canvas.getContext('2d')

				if (existingProcessedImage?.canvas) {
					canvas.width = existingProcessedImage.canvas.width
					canvas.height = existingProcessedImage.canvas.height
					ctx?.drawImage(existingProcessedImage.canvas, 0, 0)
				} else {
					const img = new Image()
					await new Promise((resolve, reject) => {
						img.onload = resolve
						img.onerror = reject
						img.src = URL.createObjectURL(file)
					})

					canvas.width = img.width
					canvas.height = img.height
					ctx?.drawImage(img, 0, 0)
				}

				if (ctx) {
					const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
					const data = imageData.data

					for (let i = 0; i < data.length; i += 4) {
						let r = data[i]
						let g = data[i + 1]
						let b = data[i + 2]

						r = Math.max(0, Math.min(255, r + redAdjustment))
						g = Math.max(0, Math.min(255, g + greenAdjustment))
						b = Math.max(0, Math.min(255, b + blueAdjustment))

						if (brightness !== 0) {
							r = Math.max(0, Math.min(255, r + brightness))
							g = Math.max(0, Math.min(255, g + brightness))
							b = Math.max(0, Math.min(255, b + brightness))
						}

						if (contrast !== 0) {
							const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
							r = Math.max(0, Math.min(255, factor * (r - 128) + 128))
							g = Math.max(0, Math.min(255, factor * (g - 128) + 128))
							b = Math.max(0, Math.min(255, factor * (b - 128) + 128))
						}

						if (saturation !== 0) {
							const max = Math.max(r, g, b) / 255
							const min = Math.min(r, g, b) / 255
							const diff = max - min
							const sum = max + min
							const lightness = sum / 2

							if (diff !== 0) {
								const currentSaturation =
									lightness < 0.5 ? diff / sum : diff / (2 - sum)
								const newSaturation = Math.max(
									0,
									Math.min(1, currentSaturation + saturation / 100)
								)

								const saturationRatio =
									currentSaturation === 0
										? 0
										: newSaturation / currentSaturation

								const rNorm = r / 255 - lightness
								const gNorm = g / 255 - lightness
								const bNorm = b / 255 - lightness

								r = Math.max(
									0,
									Math.min(255, (lightness + rNorm * saturationRatio) * 255)
								)
								g = Math.max(
									0,
									Math.min(255, (lightness + gNorm * saturationRatio) * 255)
								)
								b = Math.max(
									0,
									Math.min(255, (lightness + bNorm * saturationRatio) * 255)
								)
							}
						}

						data[i] = Math.round(r)
						data[i + 1] = Math.round(g)
						data[i + 2] = Math.round(b)

						if (opacity < 100) {
							data[i + 3] = Math.round((data[i + 3] * opacity) / 100)
						}
					}

					ctx.putImageData(imageData, 0, 0)
				}

				const blob = await new Promise<Blob | null>(resolve =>
					canvas.toBlob(resolve, targetMimeType, targetQuality)
				)

				const processedImage: ProcessedImage = {
					file,
					originalSize: file.size,
					newSize: blob?.size,
					canvas,
					url: canvas.toDataURL(targetMimeType, targetQuality),
					mimeType: targetMimeType,
					quality: targetQuality,
				}

				processedImages.push(processedImage)
			} catch (error) {
				console.error(`Помилка обробки ${file.name}:`, error)
			}
		}

		onProcess(processedImages)
		setIsProcessing(false)
	}

	const resetAll = () => {
		setRedAdjustment(0)
		setGreenAdjustment(0)
		setBlueAdjustment(0)
		setBrightness(0)
		setContrast(0)
		setSaturation(0)
		setOpacity(100)
	}

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const totalOriginalSize = images.reduce((sum, img) => sum + img.size, 0)

	const adjustments = [
		{
			label: 'Червоний',
			value: redAdjustment,
			setter: setRedAdjustment,
			color: 'red',
			icon: '🔴',
		},
		{
			label: 'Зелений',
			value: greenAdjustment,
			setter: setGreenAdjustment,
			color: 'green',
			icon: '🟢',
		},
		{
			label: 'Синій',
			value: blueAdjustment,
			setter: setBlueAdjustment,
			color: 'blue',
			icon: '🔵',
		},
		{
			label: 'Яскравість',
			value: brightness,
			setter: setBrightness,
			color: 'yellow',
			icon: '☀️',
		},
		{
			label: 'Контрастність',
			value: contrast,
			setter: setContrast,
			color: 'gray',
			icon: '⚫',
		},
		{
			label: 'Насиченість',
			value: saturation,
			setter: setSaturation,
			color: 'purple',
			icon: '🌈',
		},
		{
			label: 'Прозорість',
			value: opacity,
			min: 0,
			max: 100,
			setter: setOpacity,
			color: 'cyan',
			icon: '💧',
		},
	]

	return (
		<div className='space-y-6'>
			<div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-6'>
				<div className='flex justify-between items-center mb-6'>
					<h3 className='text-lg font-semibold text-gray-800 dark:text-white'>
						Налаштування колірного балансу
					</h3>
					<button
						onClick={resetAll}
						className='px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors'
					>
						Скинути все
					</button>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{adjustments.map(adj => (
						<div key={adj.label} className='space-y-2'>
							<div className='flex items-center justify-between'>
								<label className='flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300'>
									<span>{adj.icon}</span>
									<span>{adj.label}</span>
								</label>
								<span className='text-sm text-gray-500 dark:text-gray-400'>
									{adj.label === 'Прозорість'
										? `${adj.value}%`
										: `${adj.value > 0 ? '+' : ''}${adj.value}`}
								</span>
							</div>
							<input
								type='range'
								min={adj.min !== undefined ? adj.min : -100}
								max={adj.max !== undefined ? adj.max : 100}
								step='1'
								value={adj.value}
								onChange={e => adj.setter(parseInt(e.target.value))}
								className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
									adj.color === 'red'
										? 'bg-red-200 dark:bg-red-800'
										: adj.color === 'green'
										? 'bg-green-200 dark:bg-green-800'
										: adj.color === 'blue'
										? 'bg-blue-200 dark:bg-blue-800'
										: adj.color === 'yellow'
										? 'bg-yellow-200 dark:bg-yellow-800'
										: adj.color === 'purple'
										? 'bg-purple-200 dark:bg-purple-800'
										: adj.color === 'cyan'
										? 'bg-cyan-200 dark:bg-cyan-800'
										: 'bg-gray-200 dark:bg-gray-600'
								}`}
							/>
							<div className='flex justify-between text-xs text-gray-500 dark:text-gray-400'>
								<span>{adj.min !== undefined ? adj.min : -100}</span>
								<span>{adj.label === 'Прозорість' ? '50' : '0'}</span>
								<span>{adj.max !== undefined ? adj.max : 100}</span>
							</div>
						</div>
					))}
				</div>

				<div className='mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
					<div className='flex items-center justify-between'>
						<div>
							<p className='text-sm font-medium text-blue-800 dark:text-blue-200'>
								Файлів для обробки: {images.length}
							</p>
							<p className='text-sm text-blue-600 dark:text-blue-300'>
								Загальний розмір: {formatFileSize(totalOriginalSize)}
							</p>
						</div>
					</div>
				</div>

				<div className='mt-6'>
					<button
						onClick={adjustImages}
						disabled={isProcessing}
						className='w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2'
					>
						{isProcessing ? (
							<>
								<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
								<span>Обробка...</span>
							</>
						) : (
							<>
								<span>⚖️</span>
								<span>Застосувати корекцію</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

export default ColorBalance
