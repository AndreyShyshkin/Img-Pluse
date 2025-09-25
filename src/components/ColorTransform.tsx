'use client'

import { useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface ColorTransformProps {
	images: File[]
	processedImages: ProcessedImage[]
	onProcess: (images: ProcessedImage[]) => void
	isProcessing: boolean
	setIsProcessing: (processing: boolean) => void
}

const ColorTransform: React.FC<ColorTransformProps> = ({
	images,
	processedImages: existingProcessedImages,
	onProcess,
	isProcessing,
	setIsProcessing,
}) => {
	const [sourceColor, setSourceColor] = useState('#FF0000')
	const [targetColor, setTargetColor] = useState('#00FF00')
	const [tolerance, setTolerance] = useState(30)
	const [transformType, setTransformType] = useState<
		'replace' | 'grayscale' | 'sepia' | 'invert'
	>('replace')

	const transformTypes = [
		{
			value: 'replace' as const,
			label: 'Заміна кольору',
			icon: '🎨',
			description: 'Замінити один колір на інший',
		},
		{
			value: 'grayscale' as const,
			label: 'Чорно-білий',
			icon: '⚫',
			description: 'Перетворити в градації сірого',
		},
		{
			value: 'sepia' as const,
			label: 'Сепія',
			icon: '🟤',
			description: 'Застосувати ефект сепії',
		},
		{
			value: 'invert' as const,
			label: 'Інверсія',
			icon: '🔄',
			description: 'Інвертувати всі кольори',
		},
	]

	const colorDistance = (
		r1: number,
		g1: number,
		b1: number,
		r2: number,
		g2: number,
		b2: number
	) => {
		return Math.sqrt(
			Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
		)
	}

	const hexToRgb = (hex: string) => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
			  }
			: null
	}

	const transformImages = async () => {
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

					const sourceRgb = hexToRgb(sourceColor)
					const targetRgb = hexToRgb(targetColor)

					for (let i = 0; i < data.length; i += 4) {
						const r = data[i]
						const g = data[i + 1]
						const b = data[i + 2]

						switch (transformType) {
							case 'replace':
								if (sourceRgb && targetRgb) {
									const distance = colorDistance(
										r,
										g,
										b,
										sourceRgb.r,
										sourceRgb.g,
										sourceRgb.b
									)
									if (distance <= tolerance) {
										const factor = 1 - distance / tolerance
										data[i] = Math.round(r + (targetRgb.r - r) * factor)
										data[i + 1] = Math.round(g + (targetRgb.g - g) * factor)
										data[i + 2] = Math.round(b + (targetRgb.b - b) * factor)
									}
								}
								break

							case 'grayscale':
								const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
								data[i] = gray
								data[i + 1] = gray
								data[i + 2] = gray
								break

							case 'sepia':
								const sepiaR = Math.min(
									255,
									Math.round(r * 0.393 + g * 0.769 + b * 0.189)
								)
								const sepiaG = Math.min(
									255,
									Math.round(r * 0.349 + g * 0.686 + b * 0.168)
								)
								const sepiaB = Math.min(
									255,
									Math.round(r * 0.272 + g * 0.534 + b * 0.131)
								)
								data[i] = sepiaR
								data[i + 1] = sepiaG
								data[i + 2] = sepiaB
								break

							case 'invert':
								data[i] = 255 - r
								data[i + 1] = 255 - g
								data[i + 2] = 255 - b
								break
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
					Налаштування перетворення кольорів
				</h3>

				<div className='mb-6'>
					<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
						Тип перетворення
					</label>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{transformTypes.map(type => (
							<label
								key={type.value}
								className='flex items-start space-x-3 cursor-pointer p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600'
							>
								<input
									type='radio'
									name='transformType'
									value={type.value}
									checked={transformType === type.value}
									onChange={e =>
										setTransformType(e.target.value as typeof transformType)
									}
									className='text-blue-600 focus:ring-blue-500 mt-1'
								/>
								<div>
									<div className='flex items-center space-x-2'>
										<span className='text-lg'>{type.icon}</span>
										<span className='text-sm font-medium text-gray-900 dark:text-white'>
											{type.label}
										</span>
									</div>
									<div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
										{type.description}
									</div>
								</div>
							</label>
						))}
					</div>
				</div>

				{transformType === 'replace' && (
					<div className='space-y-4'>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Колір для заміни
								</label>
								<div className='flex items-center space-x-2'>
									<input
										type='color'
										value={sourceColor}
										onChange={e => setSourceColor(e.target.value)}
										className='w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer'
									/>
									<input
										type='text'
										value={sourceColor}
										onChange={e => setSourceColor(e.target.value)}
										className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white'
										placeholder='#FF0000'
									/>
								</div>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Новий колір
								</label>
								<div className='flex items-center space-x-2'>
									<input
										type='color'
										value={targetColor}
										onChange={e => setTargetColor(e.target.value)}
										className='w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer'
									/>
									<input
										type='text'
										value={targetColor}
										onChange={e => setTargetColor(e.target.value)}
										className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white'
										placeholder='#00FF00'
									/>
								</div>
							</div>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
								Допустимість ({tolerance})
							</label>
							<input
								type='range'
								min='0'
								max='100'
								value={tolerance}
								onChange={e => setTolerance(parseInt(e.target.value))}
								className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600'
							/>
							<div className='flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1'>
								<span>Точно</span>
								<span>Приблизно</span>
							</div>
							<p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
								Чим більше значення, тим більше відтінків буде замінено
							</p>
						</div>
					</div>
				)}

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
						onClick={transformImages}
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
								<span>🎨</span>
								<span>Перетворити кольори</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

export default ColorTransform
