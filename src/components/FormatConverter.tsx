'use client'

import { useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface FormatConverterProps {
	images: File[]
	onProcess: (images: ProcessedImage[]) => void
	isProcessing: boolean
	setIsProcessing: (processing: boolean) => void
}

const FormatConverter: React.FC<FormatConverterProps> = ({
	images,
	onProcess,
	isProcessing,
	setIsProcessing,
}) => {
	const [targetFormat, setTargetFormat] = useState<'png' | 'jpeg' | 'webp'>(
		'png'
	)
	const [quality, setQuality] = useState(0.9)

	const formats = [
		{
			value: 'png' as const,
			label: 'PNG',
			description: 'Без втрат, підтримує прозорість',
		},
		{
			value: 'jpeg' as const,
			label: 'JPEG',
			description: 'З втратами, менший розмір',
		},
		{
			value: 'webp' as const,
			label: 'WebP',
			description: 'Сучасний формат, кращий стиск',
		},
	]

	const convertImages = async () => {
		if (images.length === 0) return

		setIsProcessing(true)
		const processedImages: ProcessedImage[] = []

		for (const file of images) {
			try {
				const canvas = document.createElement('canvas')
				const ctx = canvas.getContext('2d')
				const img = new Image()

				await new Promise((resolve, reject) => {
					img.onload = resolve
					img.onerror = reject
					img.src = URL.createObjectURL(file)
				})

				canvas.width = img.width
				canvas.height = img.height
				ctx?.drawImage(img, 0, 0)

				// Конвертація у вибраний формат
				const mimeType = `image/${targetFormat}`
				const blob = await new Promise<Blob | null>(resolve =>
					canvas.toBlob(
						resolve,
						mimeType,
						targetFormat === 'jpeg' ? quality : undefined
					)
				)

				const processedImage: ProcessedImage = {
					file,
					originalSize: file.size,
					newSize: blob?.size,
					canvas,
					url: canvas.toDataURL(
						mimeType,
						targetFormat === 'jpeg' ? quality : undefined
					),
					mimeType,
					quality: targetFormat === 'jpeg' ? quality : undefined,
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
					Налаштування конвертації
				</h3>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{/* Вибір формату */}
					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
							Цільовий формат
						</label>
						<div className='space-y-3'>
							{formats.map(format => (
								<label
									key={format.value}
									className='flex items-center space-x-3 cursor-pointer'
								>
									<input
										type='radio'
										name='format'
										value={format.value}
										checked={targetFormat === format.value}
										onChange={e =>
											setTargetFormat(e.target.value as typeof targetFormat)
										}
										className='text-blue-600 focus:ring-blue-500'
									/>
									<div>
										<div className='text-sm font-medium text-gray-900 dark:text-white'>
											{format.label}
										</div>
										<div className='text-xs text-gray-500 dark:text-gray-400'>
											{format.description}
										</div>
									</div>
								</label>
							))}
						</div>
					</div>

					{/* Налаштування якості */}
					{targetFormat === 'jpeg' && (
						<div>
							<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
								Якість ({Math.round(quality * 100)}%)
							</label>
							<input
								type='range'
								min='0.1'
								max='1'
								step='0.1'
								value={quality}
								onChange={e => setQuality(parseFloat(e.target.value))}
								className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600'
							/>
							<div className='flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1'>
								<span>Низька</span>
								<span>Висока</span>
							</div>
						</div>
					)}
				</div>

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

				{/* Кнопка конвертації */}
				<div className='mt-6'>
					<button
						onClick={convertImages}
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
								<span>🔄</span>
								<span>Конвертувати у {targetFormat.toUpperCase()}</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

export default FormatConverter
