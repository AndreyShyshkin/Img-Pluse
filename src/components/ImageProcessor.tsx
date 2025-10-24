'use client'

import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { useCallback, useEffect, useRef, useState } from 'react'
import ColorBalance from './ColorBalance'
import ColorTransform from './ColorTransform'
import FormatConverter from './FormatConverter'
import ImageMerger from './ImageMerger'
import ProcessingStats from './ProcessingStats'
import SizeConverter from './SizeConverter'
import Slideshow from './Slideshow'
import WatermarkTool from './WatermarkTool'

export interface ProcessedImage {
	file: File
	originalSize: number
	newSize?: number
	canvas?: HTMLCanvasElement
	url?: string
	mimeType?: string
	quality?: number
}

export interface HistoryEntry {
	id: string
	timestamp: Date
	operation: string
	description: string
	processedImages: ProcessedImage[]
}

const ImageProcessor: React.FC = () => {
	const [selectedImages, setSelectedImages] = useState<File[]>([])
	const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
	const [history, setHistory] = useState<HistoryEntry[]>([])
	const [activeTab, setActiveTab] = useState<
		| 'format'
		| 'size'
		| 'color'
		| 'balance'
		| 'merge'
		| 'watermark'
		| 'slideshow'
	>('format')
	const [isProcessing, setIsProcessing] = useState(false)
	const [showStartScreen, setShowStartScreen] = useState(true)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const tabs = [
		{ id: 'format' as const, label: 'Конвертація форматів', icon: '🔄' },
		{ id: 'size' as const, label: 'Зміна розміру', icon: '📏' },
		{ id: 'color' as const, label: 'Перетворення кольорів', icon: '🎨' },
		{ id: 'balance' as const, label: 'Колірний баланс', icon: '⚖️' },
		{ id: 'merge' as const, label: "Об'єднання", icon: '🖼️' },
		{ id: 'watermark' as const, label: 'Водяний знак', icon: '💧' },
		{ id: 'slideshow' as const, label: 'Слайд-шоу', icon: '🎬' },
	]

	const handleImageSelect = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files || [])
			if (files.length > 0) {
				setSelectedImages(files)
				const processed = files.map(file => ({
					file,
					originalSize: file.size,
					url: URL.createObjectURL(file),
					mimeType: file.type,
					quality: file.type === 'image/jpeg' ? 0.9 : undefined,
				}))
				setProcessedImages(processed)
				setHistory([])
			}
		},
		[]
	)

	const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault()
		const files = Array.from(event.dataTransfer.files)
		const imageFiles = files.filter(file => file.type.startsWith('image/'))
		if (imageFiles.length > 0) {
			setSelectedImages(imageFiles)
			const processed = imageFiles.map(file => ({
				file,
				originalSize: file.size,
				url: URL.createObjectURL(file),
				mimeType: file.type,
				quality: file.type === 'image/jpeg' ? 1.0 : undefined,
			}))
			setProcessedImages(processed)
			setHistory([])
		}
	}, [])

	const handleDragOver = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault()
		},
		[]
	)

	const addToHistory = useCallback(
		(operation: string, description: string, images: ProcessedImage[]) => {
			const newEntry: HistoryEntry = {
				id: Date.now().toString(),
				timestamp: new Date(),
				operation,
				description,
				processedImages: images.map(img => ({
					...img,
					canvas: img.canvas ? cloneCanvas(img.canvas) : undefined,
				})),
			}
			setHistory(prev => [...prev, newEntry])
		},
		[]
	)

	const cloneCanvas = (original: HTMLCanvasElement): HTMLCanvasElement => {
		const clone = document.createElement('canvas')
		const ctx = clone.getContext('2d')
		clone.width = original.width
		clone.height = original.height
		ctx?.drawImage(original, 0, 0)
		return clone
	}

	const restoreFromHistory = useCallback(
		(entry: HistoryEntry) => {
			const entryIndex = history.findIndex(h => h.id === entry.id)

			setHistory(prev => prev.slice(0, entryIndex + 1))

			setProcessedImages(
				entry.processedImages.map(img => ({
					...img,
					canvas: img.canvas ? cloneCanvas(img.canvas) : undefined,
					url: img.canvas
						? img.canvas.toDataURL(img.mimeType || 'image/png', img.quality)
						: img.url,
				}))
			)
		},
		[history]
	)

	const downloadFromHistory = useCallback(async (entry: HistoryEntry) => {
		const images = entry.processedImages
		if (images.length === 0) return

		if (images.length === 1 && images[0].canvas) {
			const img = images[0]
			img.canvas!.toBlob(
				blob => {
					if (blob) {
						const fileName = `${entry.operation}-${img.file.name.replace(
							/\.[^/.]+$/,
							''
						)}.${
							img.mimeType === 'image/jpeg'
								? 'jpg'
								: img.mimeType === 'image/webp'
								? 'webp'
								: 'png'
						}`
						saveAs(blob, fileName)
					}
				},
				img.mimeType || 'image/png',
				img.quality
			)
		} else if (images.length > 1) {
			const zip = new JSZip()

			for (const image of images) {
				if (image.canvas) {
					const blob = await new Promise<Blob | null>(resolve =>
						image.canvas!.toBlob(
							resolve,
							image.mimeType || 'image/png',
							image.quality
						)
					)
					if (blob) {
						const fileName = `${entry.operation}-${image.file.name.replace(
							/\.[^/.]+$/,
							''
						)}.${
							image.mimeType === 'image/jpeg'
								? 'jpg'
								: image.mimeType === 'image/webp'
								? 'webp'
								: 'png'
						}`
						zip.file(fileName, blob)
					}
				}
			}

			const content = await zip.generateAsync({ type: 'blob' })
			saveAs(content, `${entry.operation}-images.zip`)
		}
	}, [])

	const resetToOriginal = useCallback(() => {
		const originalProcessed = selectedImages.map(file => ({
			file,
			originalSize: file.size,
			url: URL.createObjectURL(file),
			mimeType: file.type,
			quality: file.type === 'image/jpeg' ? 0.9 : undefined,
		}))
		setProcessedImages(originalProcessed)
		setHistory([])
	}, [selectedImages])

	const downloadAll = useCallback(async () => {
		if (processedImages.length === 0) return

		if (processedImages.length === 1 && processedImages[0].canvas) {
			const processedImage = processedImages[0]
			processedImage.canvas!.toBlob(
				blob => {
					if (blob) {
						const fileName = `processed-${processedImage.file.name.replace(
							/\.[^/.]+$/,
							''
						)}.${
							processedImage.mimeType === 'image/jpeg'
								? 'jpg'
								: processedImage.mimeType === 'image/webp'
								? 'webp'
								: 'png'
						}`
						saveAs(blob, fileName)
					}
				},
				processedImage.mimeType || 'image/png',
				processedImage.quality
			)
		} else if (processedImages.length > 1) {
			const zip = new JSZip()

			for (const image of processedImages) {
				if (image.canvas) {
					const blob = await new Promise<Blob | null>(resolve =>
						image.canvas!.toBlob(
							resolve,
							image.mimeType || 'image/png',
							image.quality
						)
					)
					if (blob) {
						const fileName = `processed-${image.file.name.replace(
							/\.[^/.]+$/,
							''
						)}.${
							image.mimeType === 'image/jpeg'
								? 'jpg'
								: image.mimeType === 'image/webp'
								? 'webp'
								: 'png'
						}`
						zip.file(fileName, blob)
					}
				}
			}

			const content = await zip.generateAsync({ type: 'blob' })
			saveAs(content, 'processed-images.zip')
		}
	}, [processedImages])

	useEffect(() => {
		return () => {
			processedImages.forEach(image => {
				if (image.url && image.url.startsWith('blob:')) {
					URL.revokeObjectURL(image.url)
				}
			})
		}
	}, [processedImages])

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const handleToolSelect = useCallback((toolId: typeof activeTab) => {
		setActiveTab(toolId)
		setShowStartScreen(false)
	}, [])

	// Start screen
	if (showStartScreen) {
		return (
			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8'>
				<div className='max-w-5xl mx-auto'>
					{/* Upload area */}
					<div
						className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 mb-12 border-4 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer'
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onClick={() => fileInputRef.current?.click()}
					>
						<input
							ref={fileInputRef}
							type='file'
							multiple
							accept='image/*'
							onChange={handleImageSelect}
							className='hidden'
						/>
						<div className='text-center'>
							<div className='text-7xl mb-6'>📁</div>
							<h2 className='text-2xl font-semibold text-gray-800 dark:text-white mb-3'>
								Завантажте зображення
							</h2>
							<p className='text-gray-600 dark:text-gray-400 mb-4'>
								Перетягніть файли сюди або клацніть для вибору
							</p>
							<p className='text-sm text-gray-500 dark:text-gray-500'>
								Підтримуються: JPG, PNG, WebP, GIF
							</p>
						</div>
					</div>

					{/* Tools grid */}
					<div className='mb-8'>
						<h3 className='text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center'>
							{selectedImages.length > 0
								? `Завантажено ${selectedImages.length} ${
										selectedImages.length === 1 ? 'зображення' : 'зображень'
								  }. Оберіть інструмент:`
								: 'Оберіть інструмент'}
						</h3>
						<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
							{tabs.map(tab => (
								<button
									key={tab.id}
									onClick={() => handleToolSelect(tab.id)}
									disabled={selectedImages.length === 0}
									className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 text-center group hover:scale-105 border-2 border-transparent hover:border-blue-400 ${
										selectedImages.length === 0
											? 'opacity-50 cursor-not-allowed'
											: ''
									}`}
								>
									<div className='text-5xl mb-3 group-hover:scale-110 transition-transform'>
										{tab.icon}
									</div>
									<h4 className='font-semibold text-gray-800 dark:text-white mb-1'>
										{tab.label}
									</h4>
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden'>
			{/* Header with back button */}
			<div className=' px-6 py-3 flex items-center justify-between'>
				<button
					onClick={() => {
						setShowStartScreen(true)
						setSelectedImages([])
						setProcessedImages([])
						setHistory([])
					}}
					className='text-gray hover:bg-white/20 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 cursor-pointer'
				>
					<span>←</span>
					<span>Головна</span>
				</button>
			</div>

			<div className='border-b border-gray-200 dark:border-gray-700'>
				<div className='overflow-x-auto'>
					<nav className='-mb-px flex space-x-8 px-6 min-w-max'>
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
									activeTab === tab.id
										? 'border-blue-500 text-blue-600 dark:text-blue-400'
										: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
								}`}
							>
								<span>{tab.icon}</span>
								<span>{tab.label}</span>
							</button>
						))}
					</nav>
				</div>
			</div>

			<div className='p-6'>
				<div
					className='border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center mb-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors'
					onDrop={handleDrop}
					onDragOver={handleDragOver}
				>
					<input
						ref={fileInputRef}
						type='file'
						multiple
						accept='image/*'
						onChange={handleImageSelect}
						className='hidden'
					/>

					<div className='space-y-4'>
						<div className='text-4xl'>📁</div>
						<div>
							<p className='text-lg font-medium text-gray-700 dark:text-gray-300'>
								Перетягніть зображення сюди або натисніть для вибору
							</p>
							<p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>
								Підтримуються: PNG, JPG, JPEG, WebP, GIF
							</p>
						</div>
						<button
							onClick={() => fileInputRef.current?.click()}
							className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors'
						>
							Вибрати файли
						</button>
					</div>
				</div>

				{selectedImages.length > 0 && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-white'>
							Вибрані зображення ({selectedImages.length})
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
							{processedImages.map((image, index) => (
								<div
									key={index}
									className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'
								>
									<div className='aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden'>
										{image.url ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={image.url}
												alt={image.file.name}
												className='w-full h-full object-cover'
											/>
										) : (
											<div className='w-full h-full flex items-center justify-center text-gray-400'>
												<span className='text-2xl'>🖼️</span>
											</div>
										)}
									</div>
									<p className='text-sm font-medium text-gray-700 dark:text-gray-300 truncate'>
										{image.file.name}
									</p>
									<p className='text-xs text-gray-500 dark:text-gray-400'>
										Оригінал: {formatFileSize(image.originalSize)}
										{image.newSize && (
											<>
												{' → '}
												<span
													className={
														image.newSize < image.originalSize
															? 'text-green-600'
															: 'text-red-600'
													}
												>
													{formatFileSize(image.newSize)}
												</span>
											</>
										)}
									</p>
								</div>
							))}
						</div>
					</div>
				)}

				{selectedImages.length > 0 && (
					<div className='space-y-6'>
						{activeTab === 'format' && (
							<FormatConverter
								images={selectedImages}
								onProcess={images => {
									setProcessedImages(images)
									if (images.some(img => img.canvas)) {
										addToHistory('format', 'Конвертація формату', images)
									}
								}}
								isProcessing={isProcessing}
								setIsProcessing={setIsProcessing}
							/>
						)}
						{activeTab === 'size' && (
							<SizeConverter
								images={selectedImages}
								processedImages={processedImages}
								onProcess={images => {
									setProcessedImages(images)
									if (images.some(img => img.canvas)) {
										addToHistory('size', 'Зміна розміру', images)
									}
								}}
								isProcessing={isProcessing}
								setIsProcessing={setIsProcessing}
							/>
						)}
						{activeTab === 'color' && (
							<ColorTransform
								images={selectedImages}
								processedImages={processedImages}
								onProcess={images => {
									setProcessedImages(images)
									if (images.some(img => img.canvas)) {
										addToHistory('color', 'Перетворення кольорів', images)
									}
								}}
								isProcessing={isProcessing}
								setIsProcessing={setIsProcessing}
							/>
						)}
						{activeTab === 'balance' && (
							<ColorBalance
								images={selectedImages}
								processedImages={processedImages}
								onProcess={images => {
									setProcessedImages(images)
									if (images.some(img => img.canvas)) {
										addToHistory(
											'balance',
											'Корекція кольорового балансу',
											images
										)
									}
								}}
								isProcessing={isProcessing}
								setIsProcessing={setIsProcessing}
							/>
						)}
						{activeTab === 'merge' && (
							<ImageMerger
								images={selectedImages}
								processedImages={processedImages}
								onProcess={images => {
									setProcessedImages(images)
									if (images.some(img => img.canvas)) {
										addToHistory('merge', "Об'єднання зображень", images)
									}
								}}
								isProcessing={isProcessing}
								setIsProcessing={setIsProcessing}
							/>
						)}
						{activeTab === 'watermark' && (
							<WatermarkTool
								images={selectedImages}
								processedImages={processedImages}
								onProcess={images => {
									setProcessedImages(images)
									if (images.some(img => img.canvas)) {
										addToHistory(
											'watermark',
											'Додавання водяного знаку',
											images
										)
									}
								}}
								isProcessing={isProcessing}
								setIsProcessing={setIsProcessing}
							/>
						)}
						{activeTab === 'slideshow' && (
							<Slideshow
								images={selectedImages}
								processedImages={processedImages}
							/>
						)}

						{processedImages.some(img => img.canvas) && (
							<div className='flex justify-center'>
								<button
									onClick={downloadAll}
									disabled={isProcessing}
									className='bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg transition-colors flex items-center space-x-2'
								>
									<span>💾</span>
									<span>
										{processedImages.length === 1
											? 'Завантажити зображення'
											: `Завантажити всі (${processedImages.length})`}
									</span>
								</button>
							</div>
						)}

						{processedImages.some(img => img.canvas) && (
							<ProcessingStats processedImages={processedImages} />
						)}

						{history.length > 0 && (
							<div className='mt-8 border-t border-gray-200 dark:border-gray-700 pt-6'>
								<h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center'>
									<span className='mr-2'>📜</span>
									Історія змін
								</h3>
								<div className='space-y-3 max-h-96 overflow-y-auto'>
									{history.map((entry, index) => (
										<div
											key={entry.id}
											className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between'
										>
											<div className='flex-1'>
												<div className='flex items-center space-x-3'>
													<span className='text-sm font-medium text-gray-600 dark:text-gray-300'>
														#{history.length - index}
													</span>
													<span className='font-medium text-gray-800 dark:text-white'>
														{entry.description}
													</span>
													<span className='text-xs text-gray-500 dark:text-gray-400'>
														{entry.timestamp.toLocaleString('uk-UA', {
															day: '2-digit',
															month: '2-digit',
															year: 'numeric',
															hour: '2-digit',
															minute: '2-digit',
														})}
													</span>
												</div>
												<div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
													{entry.processedImages.length} файл(ів)
													{entry.processedImages[0]?.newSize && (
														<span className='ml-2'>
															→{' '}
															{formatFileSize(entry.processedImages[0].newSize)}
														</span>
													)}
												</div>
											</div>
											<div className='flex items-center space-x-2 ml-4'>
												<button
													onClick={() => restoreFromHistory(entry)}
													className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors flex items-center space-x-1'
													title='Відновити цей стан'
												>
													<span>↩️</span>
													<span>Відновити</span>
												</button>
												<button
													onClick={() => downloadFromHistory(entry)}
													className='bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors flex items-center space-x-1'
													title='Завантажити файли з цього стану'
												>
													<span>💾</span>
													<span>Завантажити</span>
												</button>
											</div>
										</div>
									))}
								</div>
								<div className='mt-4 text-center'>
									<button
										onClick={resetToOriginal}
										className='text-red-500 hover:text-red-700 text-sm transition-colors flex items-center justify-center mx-auto space-x-1'
									>
										<span>🗑️</span>
										<span>Скинути до оригіналу</span>
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export default ImageProcessor
