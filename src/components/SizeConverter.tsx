'use client'

import { useEffect, useRef, useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface SizeConverterProps {
	images: File[]
	processedImages: ProcessedImage[]
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
		'percentage' | 'fixed' | 'width' | 'height' | 'crop'
	>('percentage')
	const [percentage, setPercentage] = useState(100)
	const [width, setWidth] = useState(800)
	const [height, setHeight] = useState(600)
	const [maintainAspect, setMaintainAspect] = useState(true)

	const [cropArea, setCropArea] = useState({
		x: 0,
		y: 0,
		width: 100,
		height: 100,
	})
	const [isDragging, setIsDragging] = useState(false)
	const [dragHandle, setDragHandle] = useState<string | null>(null)
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const previewRef = useRef<HTMLDivElement>(null)

	const resizeModes = [
		{ value: 'percentage' as const, label: 'За відсотками', icon: '%' },
		{ value: 'fixed' as const, label: 'Фіксований розмір', icon: '📐' },
		{ value: 'width' as const, label: 'За шириною', icon: '↔️' },
		{ value: 'height' as const, label: 'За висотою', icon: '↕️' },
		{ value: 'crop' as const, label: 'Кадрування', icon: '✂️' },
	]

	const resizeImages = async () => {
		if (images.length === 0) return

		setIsProcessing(true)
		const processedImages: ProcessedImage[] = []

		for (const file of images) {
			try {
				const existingProcessedImage = existingProcessedImages.find(
					p => p.file === file
				)

				const targetMimeType =
					existingProcessedImage?.mimeType || file.type || 'image/png'
				const targetQuality =
					existingProcessedImage?.quality ||
					(file.type === 'image/jpeg' ? 0.9 : undefined)

				const canvas = document.createElement('canvas')
				const ctx = canvas.getContext('2d')
				const img = new Image()

				if (existingProcessedImage?.canvas) {
					canvas.width = existingProcessedImage.canvas.width
					canvas.height = existingProcessedImage.canvas.height
					ctx?.drawImage(existingProcessedImage.canvas, 0, 0)

					img.width = existingProcessedImage.canvas.width
					img.height = existingProcessedImage.canvas.height
				} else {
					await new Promise((resolve, reject) => {
						img.onload = resolve
						img.onerror = reject
						img.src = URL.createObjectURL(file)
					})

					canvas.width = img.width
					canvas.height = img.height
					ctx?.drawImage(img, 0, 0)
				}

				const outputCanvas = document.createElement('canvas')
				const outputCtx = outputCanvas.getContext('2d')

				let newWidth = img.width
				let newHeight = img.height

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

					case 'crop':
						const cropX = Math.round((img.width * cropArea.x) / 100)
						const cropY = Math.round((img.height * cropArea.y) / 100)
						const cropWidth = Math.round((img.width * cropArea.width) / 100)
						const cropHeight = Math.round((img.height * cropArea.height) / 100)

						newWidth = cropWidth
						newHeight = cropHeight

						outputCanvas.width = newWidth
						outputCanvas.height = newHeight

						if (outputCtx) {
							outputCtx.imageSmoothingEnabled = true
							outputCtx.imageSmoothingQuality = 'high'
							outputCtx.drawImage(
								canvas,
								cropX,
								cropY,
								cropWidth,
								cropHeight,
								0,
								0,
								newWidth,
								newHeight
							)
						}
						break
				}

				if (resizeMode !== 'crop') {
					outputCanvas.width = newWidth
					outputCanvas.height = newHeight

					if (outputCtx) {
						outputCtx.imageSmoothingEnabled = true
						outputCtx.imageSmoothingQuality = 'high'
						outputCtx.drawImage(canvas, 0, 0, newWidth, newHeight)
					}
				}

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

	useEffect(() => {
		if (resizeMode === 'crop' && images.length > 0 && canvasRef.current) {
			const canvas = canvasRef.current
			const ctx = canvas.getContext('2d')
			const img = new Image()

			img.onload = () => {
				canvas.width = img.width
				canvas.height = img.height
				ctx?.drawImage(img, 0, 0)

				setCropArea({
					x: 25,
					y: 25,
					width: 50,
					height: 50,
				})
			}

			img.src = URL.createObjectURL(images[0])
		}
	}, [resizeMode, images])

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging || !previewRef.current || !dragHandle) return

			const rect = previewRef.current.getBoundingClientRect()
			const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100
			const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100

			setCropArea(prev => {
				const newArea = { ...prev }

				if (dragHandle === 'move') {
					newArea.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaX))
					newArea.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaY))
				} else {
					if (dragHandle.includes('e')) {
						newArea.width = Math.max(
							5,
							Math.min(100 - prev.x, prev.width + deltaX)
						)
					}
					if (dragHandle.includes('w')) {
						const newWidth = Math.max(5, prev.width - deltaX)
						const widthDiff = prev.width - newWidth
						newArea.width = newWidth
						newArea.x = Math.max(0, prev.x + widthDiff)
					}
					if (dragHandle.includes('s')) {
						newArea.height = Math.max(
							5,
							Math.min(100 - prev.y, prev.height + deltaY)
						)
					}
					if (dragHandle.includes('n')) {
						const newHeight = Math.max(5, prev.height - deltaY)
						const heightDiff = prev.height - newHeight
						newArea.height = newHeight
						newArea.y = Math.max(0, prev.y + heightDiff)
					}
				}

				return newArea
			})

			setDragStart({ x: e.clientX, y: e.clientY })
		}

		const handleMouseUp = () => {
			setIsDragging(false)
			setDragHandle(null)
		}

		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove)
			window.addEventListener('mouseup', handleMouseUp)

			return () => {
				window.removeEventListener('mousemove', handleMouseMove)
				window.removeEventListener('mouseup', handleMouseUp)
			}
		}
	}, [isDragging, dragHandle, dragStart])

	return (
		<div className='space-y-6'>
			<div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-6'>
				<h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-white'>
					Налаштування зміни розміру
				</h3>

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

				{/* Інтерактивне кадрування */}
				{resizeMode === 'crop' && images.length > 0 && (
					<div className='mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg'>
						<h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
							Перетягніть рамку для вибору області кадрування
						</h4>
						<div
							ref={previewRef}
							className='relative w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded overflow-hidden'
							style={{ maxHeight: '400px' }}
						>
							<canvas ref={canvasRef} className='w-full h-auto' />
							{/* Напівпрозора overlay для затемнення */}
							<div className='absolute inset-0 pointer-events-none'>
								<svg className='w-full h-full'>
									<defs>
										<mask id='crop-mask'>
											<rect width='100%' height='100%' fill='white' />
											<rect
												x={`${cropArea.x}%`}
												y={`${cropArea.y}%`}
												width={`${cropArea.width}%`}
												height={`${cropArea.height}%`}
												fill='black'
											/>
										</mask>
									</defs>
									<rect
										width='100%'
										height='100%'
										fill='rgba(0,0,0,0.5)'
										mask='url(#crop-mask)'
									/>
								</svg>
							</div>
							{/* Рамка кадрування */}
							<div
								className='absolute border-2 border-blue-500 cursor-move'
								style={{
									left: `${cropArea.x}%`,
									top: `${cropArea.y}%`,
									width: `${cropArea.width}%`,
									height: `${cropArea.height}%`,
								}}
								onMouseDown={e => {
									if (e.target === e.currentTarget) {
										setIsDragging(true)
										setDragHandle('move')
										setDragStart({ x: e.clientX, y: e.clientY })
									}
								}}
							>
								{/* Кути для зміни розміру */}
								{['nw', 'ne', 'sw', 'se'].map(handle => (
									<div
										key={handle}
										className='absolute w-3 h-3 bg-blue-500 border border-white cursor-pointer'
										style={{
											top: handle.includes('n') ? '-6px' : 'auto',
											bottom: handle.includes('s') ? '-6px' : 'auto',
											left: handle.includes('w') ? '-6px' : 'auto',
											right: handle.includes('e') ? '-6px' : 'auto',
											cursor:
												handle === 'nw' || handle === 'se'
													? 'nwse-resize'
													: 'nesw-resize',
										}}
										onMouseDown={e => {
											e.stopPropagation()
											setIsDragging(true)
											setDragHandle(handle)
											setDragStart({ x: e.clientX, y: e.clientY })
										}}
									/>
								))}
								{/* Середини сторін для зміни розміру */}
								{['n', 'e', 's', 'w'].map(handle => (
									<div
										key={handle}
										className='absolute bg-blue-500 border border-white cursor-pointer'
										style={{
											width: handle === 'n' || handle === 's' ? '20px' : '3px',
											height: handle === 'e' || handle === 'w' ? '20px' : '3px',
											top:
												handle === 'n'
													? '-6px'
													: handle === 's'
													? 'auto'
													: '50%',
											bottom: handle === 's' ? '-6px' : 'auto',
											left:
												handle === 'w'
													? '-6px'
													: handle === 'e'
													? 'auto'
													: '50%',
											right: handle === 'e' ? '-6px' : 'auto',
											transform:
												handle === 'n' || handle === 's'
													? 'translateX(-50%)'
													: handle === 'e' || handle === 'w'
													? 'translateY(-50%)'
													: 'none',
											cursor:
												handle === 'n' || handle === 's'
													? 'ns-resize'
													: 'ew-resize',
										}}
										onMouseDown={e => {
											e.stopPropagation()
											setIsDragging(true)
											setDragHandle(handle)
											setDragStart({ x: e.clientX, y: e.clientY })
										}}
									/>
								))}
							</div>
						</div>
						<div className='mt-3 text-xs text-gray-600 dark:text-gray-400 text-center'>
							💡 Перетягуйте рамку або змінюйте її розмір за допомогою кутів та
							країв
						</div>
					</div>
				)}

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
