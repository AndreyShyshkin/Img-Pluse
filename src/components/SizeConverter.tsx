'use client'

import { useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface SizeConverterProps {
	images: File[]
	processedImages: ProcessedImage[] // Додаємо існуючі оброблені зображення
	onProcess: (images: ProcessedImage[]) => void
	isProcessing: boolean
	setIsProcessing: (processing: boolean) => void
}

const SizeConverter: React.FC<SizeConverterProps> = ({
	images,
	processedImages: existingProcessedImages,
	onProcess,
	isProcessing,
	setIsProcessing,
}) => {
	const [resizeMode, setResizeMode] = useState<
		'percentage' | 'fixed' | 'width' | 'height'
	>('percentage')
	const [percentage, setPercentage] = useState(100)
	const [width, setWidth] = useState(800)
	const [height, setHeight] = useState(600)
	const [maintainAspect, setMaintainAspect] = useState(true)

	const resizeModes = [
		{ value: 'percentage' as const, label: 'За відсотками', icon: '%' },
		{ value: 'fixed' as const, label: 'Фіксований розмір', icon: '📐' },
		{ value: 'width' as const, label: 'За шириною', icon: '↔️' },
		{ value: 'height' as const, label: 'За висотою', icon: '↕️' },
	]

	const resizeImages = async () => {
		if (images.length === 0) return

		setIsProcessing(true)
		const processedImages: ProcessedImage[] = []

		for (const file of images) {
			try {
				// Знаходимо відповідний processedImage для збереження формату та використання попереднього результату
				const existingProcessedImage = existingProcessedImages.find(
					p => p.file === file
				)
				const targetMimeType = existingProcessedImage?.mimeType || 'image/png'
				const targetQuality = existingProcessedImage?.quality

				const canvas = document.createElement('canvas')
				const ctx = canvas.getContext('2d')
				const img = new Image()

				// Використовуємо існуючий canvas або створюємо з файлу
				if (existingProcessedImage?.canvas) {
					// Використовуємо попередній результат
					canvas.width = existingProcessedImage.canvas.width
					canvas.height = existingProcessedImage.canvas.height
					ctx?.drawImage(existingProcessedImage.canvas, 0, 0)

					// Встановлюємо розміри для обчислення нових розмірів
					img.width = existingProcessedImage.canvas.width
					img.height = existingProcessedImage.canvas.height
				} else {
					// Завантажуємо оригінальний файл (навіть якщо existingProcessedImage існує без canvas)
					await new Promise((resolve, reject) => {
						img.onload = resolve
						img.onerror = reject
						img.src = URL.createObjectURL(file)
					})

					canvas.width = img.width
					canvas.height = img.height
					ctx?.drawImage(img, 0, 0)
				}

				// Створюємо новий canvas для результату
				const outputCanvas = document.createElement('canvas')
				const outputCtx = outputCanvas.getContext('2d')

				let newWidth = img.width
				let newHeight = img.height

				// Обчислення нових розмірів
				switch (resizeMode) {
					case 'percentage':
						newWidth = Math.round((img.width * percentage) / 100)
						newHeight = Math.round((img.height * percentage) / 100)
						break

					case 'fixed':
						newWidth = width
						newHeight = height
						if (maintainAspect) {
							const aspectRatio = img.width / img.height
							if (width / height > aspectRatio) {
								newWidth = Math.round(height * aspectRatio)
							} else {
								newHeight = Math.round(width / aspectRatio)
							}
						}
						break

					case 'width':
						newWidth = width
						if (maintainAspect) {
							newHeight = Math.round(img.height * (width / img.width))
						}
						break

					case 'height':
						newHeight = height
						if (maintainAspect) {
							newWidth = Math.round(img.width * (height / img.height))
						}
						break
				}

				outputCanvas.width = newWidth
				outputCanvas.height = newHeight

				// Використовуємо високоякісний алгоритм масштабування
				if (outputCtx) {
					outputCtx.imageSmoothingEnabled = true
					outputCtx.imageSmoothingQuality = 'high'
					outputCtx.drawImage(canvas, 0, 0, newWidth, newHeight)
				}

				// Конвертація у blob для отримання розміру
				const blob = await new Promise<Blob | null>(resolve =>
					outputCanvas.toBlob(resolve, targetMimeType, targetQuality)
				)

				const processedImage: ProcessedImage = {
					file,
					originalSize: file.size,
					newSize: blob?.size,
					canvas: outputCanvas,
					url: outputCanvas.toDataURL(targetMimeType, targetQuality),
					mimeType: targetMimeType,
					quality: targetQuality,
				}

				processedImages.push(processedImage)
				URL.revokeObjectURL(img.src)
			} catch (error) {
				console.error(`Помилка обробки ${file.name}:`, error)
			}
		}

		onProcess(processedImages)
		setIsProcessing(false)
	}

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const totalOriginalSize = images.reduce((sum, img) => sum + img.size, 0)

	return (
		<div className='space-y-6'>
			<div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-6'>
				<h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-white'>
					Налаштування зміни розміру
				</h3>

				{/* Вибір режиму */}
				<div className='mb-6'>
					<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
						Режим зміни розміру
					</label>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
						{resizeModes.map(mode => (
							<label
								key={mode.value}
								className='flex items-center space-x-2 cursor-pointer'
							>
								<input
									type='radio'
									name='resizeMode'
									value={mode.value}
									checked={resizeMode === mode.value}
									onChange={e =>
										setResizeMode(e.target.value as typeof resizeMode)
									}
									className='text-blue-600 focus:ring-blue-500'
								/>
								<div className='text-center'>
									<div className='text-lg'>{mode.icon}</div>
									<div className='text-xs text-gray-600 dark:text-gray-400'>
										{mode.label}
									</div>
								</div>
							</label>
						))}
					</div>
				</div>

				{/* Налаштування розмірів */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{resizeMode === 'percentage' && (
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								Відсоток ({percentage}%)
							</label>
							<input
								type='range'
								min='10'
								max='200'
								step='10'
								value={percentage}
								onChange={e => setPercentage(parseInt(e.target.value))}
								className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600'
							/>
							<div className='flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1'>
								<span>10%</span>
								<span>200%</span>
							</div>
						</div>
					)}

					{(resizeMode === 'fixed' || resizeMode === 'width') && (
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								Ширина (px)
							</label>
							<input
								type='number'
								value={width}
								onChange={e => setWidth(parseInt(e.target.value) || 0)}
								min='1'
								max='4000'
								className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white'
							/>
						</div>
					)}

					{(resizeMode === 'fixed' || resizeMode === 'height') && (
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								Висота (px)
							</label>
							<input
								type='number'
								value={height}
								onChange={e => setHeight(parseInt(e.target.value) || 0)}
								min='1'
								max='4000'
								className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white'
							/>
						</div>
					)}
				</div>

				{/* Опція збереження пропорцій */}
				{(resizeMode === 'fixed' ||
					resizeMode === 'width' ||
					resizeMode === 'height') && (
					<div className='mt-4'>
						<label className='flex items-center space-x-2 cursor-pointer'>
							<input
								type='checkbox'
								checked={maintainAspect}
								onChange={e => setMaintainAspect(e.target.checked)}
								className='text-blue-600 focus:ring-blue-500 rounded'
							/>
							<span className='text-sm text-gray-700 dark:text-gray-300'>
								Зберігати співвідношення сторін
							</span>
						</label>
					</div>
				)}

				{/* Інформація про файли */}
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

				{/* Кнопка зміни розміру */}
				<div className='mt-6'>
					<button
						onClick={resizeImages}
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
								<span>📏</span>
								<span>Змінити розмір</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

export default SizeConverter
