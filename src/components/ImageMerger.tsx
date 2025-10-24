'use client'

import { useCallback, useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface ImageMergerProps {
	images: File[]
	processedImages: ProcessedImage[]
	onProcess: (images: ProcessedImage[]) => void
	isProcessing: boolean
	setIsProcessing: (processing: boolean) => void
}

const ImageMerger: React.FC<ImageMergerProps> = ({
	images,
	processedImages,
	onProcess,
	isProcessing,
	setIsProcessing,
}) => {
	const [direction, setDirection] = useState<'horizontal' | 'vertical'>(
		'horizontal'
	)
	const [selectedIndexes, setSelectedIndexes] = useState<number[]>([])
	const [spacing, setSpacing] = useState(0)
	const [backgroundColor, setBackgroundColor] = useState('#ffffff')

	const toggleImageSelection = (index: number) => {
		setSelectedIndexes(prev =>
			prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
		)
	}

	const mergeImages = useCallback(async () => {
		if (selectedIndexes.length < 2) {
			alert("Виберіть принаймні 2 зображення для об'єднання")
			return
		}

		setIsProcessing(true)

		try {
			const selectedImages = selectedIndexes
				.sort((a, b) => a - b)
				.map(
					i =>
						processedImages[i] || {
							file: images[i],
							originalSize: images[i].size,
						}
				)

			const loadedImages = await Promise.all(
				selectedImages.map(
					img =>
						new Promise<HTMLImageElement>((resolve, reject) => {
							const image = new Image()
							image.onload = () => resolve(image)
							image.onerror = reject
							image.src = img.url || URL.createObjectURL(img.file)
						})
				)
			)

			let totalWidth = 0
			let totalHeight = 0
			let maxWidth = 0
			let maxHeight = 0

			loadedImages.forEach(img => {
				maxWidth = Math.max(maxWidth, img.width)
				maxHeight = Math.max(maxHeight, img.height)
			})

			if (direction === 'horizontal') {
				totalWidth = loadedImages.reduce((sum, img) => sum + img.width, 0)
				totalWidth += spacing * (loadedImages.length - 1)
				totalHeight = maxHeight
			} else {
				totalWidth = maxWidth
				totalHeight = loadedImages.reduce((sum, img) => sum + img.height, 0)
				totalHeight += spacing * (loadedImages.length - 1)
			}

			const canvas = document.createElement('canvas')
			canvas.width = totalWidth
			canvas.height = totalHeight
			const ctx = canvas.getContext('2d')!

			// Fill background
			ctx.fillStyle = backgroundColor
			ctx.fillRect(0, 0, totalWidth, totalHeight)

			let currentX = 0
			let currentY = 0

			loadedImages.forEach(img => {
				if (direction === 'horizontal') {
					const y = (maxHeight - img.height) / 2
					ctx.drawImage(img, currentX, y)
					currentX += img.width + spacing
				} else {
					const x = (maxWidth - img.width) / 2
					ctx.drawImage(img, x, currentY)
					currentY += img.height + spacing
				}
			})

			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(blob => {
					if (blob) resolve(blob)
					else reject(new Error('Failed to create blob'))
				}, 'image/png')
			})

			const mergedFile = new File(
				[blob],
				`merged-${direction}-${Date.now()}.png`,
				{ type: 'image/png' }
			)

			const mergedImage: ProcessedImage = {
				file: mergedFile,
				originalSize: blob.size,
				newSize: blob.size,
				canvas: canvas,
				url: canvas.toDataURL('image/png'),
				mimeType: 'image/png',
			}

			onProcess([...processedImages, mergedImage])
		} catch (error) {
			console.error('Error merging images:', error)
			alert("Помилка при об'єднанні зображень")
		} finally {
			setIsProcessing(false)
		}
	}, [
		selectedIndexes,
		direction,
		spacing,
		backgroundColor,
		images,
		processedImages,
		onProcess,
		setIsProcessing,
	])

	return (
		<div className='space-y-6'>
			<div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4'>
				<h3 className='text-lg font-semibold mb-3 text-gray-800 dark:text-white'>
					🖼️ Об&apos;єднання зображень
				</h3>

				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Виберіть зображення для об&apos;єднання (мінімум 2)
						</label>
						<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
							{images.map((img, index) => {
								const processedImg = processedImages[index]
								return (
									<div
										key={index}
										onClick={() => toggleImageSelection(index)}
										className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
											selectedIndexes.includes(index)
												? 'border-blue-500 shadow-lg scale-105'
												: 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
										}`}
									>
										<div className='aspect-square bg-gray-100 dark:bg-gray-700'>
											{processedImg?.url ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={processedImg.url}
													alt={img.name}
													className='w-full h-full object-cover'
												/>
											) : (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={URL.createObjectURL(img)}
													alt={img.name}
													className='w-full h-full object-cover'
												/>
											)}
										</div>
										{selectedIndexes.includes(index) && (
											<div className='absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold'>
												{selectedIndexes.indexOf(index) + 1}
											</div>
										)}
										<div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate'>
											{img.name}
										</div>
									</div>
								)
							})}
						</div>
						<p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
							Вибрано: {selectedIndexes.length} зображень
						</p>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Напрямок об&apos;єднання
						</label>
						<div className='flex space-x-4'>
							<button
								onClick={() => setDirection('horizontal')}
								className={`flex-1 py-3 rounded-lg border-2 transition-all ${
									direction === 'horizontal'
										? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
										: 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
								}`}
							>
								<div className='text-2xl mb-1'>↔️</div>
								<div className='text-sm font-medium'>Горизонтально</div>
							</button>
							<button
								onClick={() => setDirection('vertical')}
								className={`flex-1 py-3 rounded-lg border-2 transition-all ${
									direction === 'vertical'
										? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
										: 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
								}`}
							>
								<div className='text-2xl mb-1'>↕️</div>
								<div className='text-sm font-medium'>Вертикально</div>
							</button>
						</div>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Відстань між зображеннями: {spacing}px
						</label>
						<input
							type='range'
							min='0'
							max='100'
							value={spacing}
							onChange={e => setSpacing(Number(e.target.value))}
							className='w-full'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Колір фону
						</label>
						<div className='flex items-center space-x-3'>
							<input
								type='color'
								value={backgroundColor}
								onChange={e => setBackgroundColor(e.target.value)}
								className='h-10 w-20 rounded cursor-pointer'
							/>
							<input
								type='text'
								value={backgroundColor}
								onChange={e => setBackgroundColor(e.target.value)}
								className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
								placeholder='#ffffff'
							/>
						</div>
					</div>

					<button
						onClick={mergeImages}
						disabled={isProcessing || selectedIndexes.length < 2}
						className='w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 rounded-lg transition-colors font-medium'
					>
						{isProcessing ? '⏳ Обробка...' : "🔗 Об'єднати зображення"}
					</button>
				</div>
			</div>
		</div>
	)
}

export default ImageMerger
