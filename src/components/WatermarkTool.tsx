'use client'

import { useCallback, useState } from 'react'
import { ProcessedImage } from './ImageProcessor'

interface WatermarkToolProps {
	images: File[]
	processedImages: ProcessedImage[]
	onProcess: (images: ProcessedImage[]) => void
	isProcessing: boolean
	setIsProcessing: (processing: boolean) => void
}

type Position =
	| 'top-left'
	| 'top-center'
	| 'top-right'
	| 'center-left'
	| 'center'
	| 'center-right'
	| 'bottom-left'
	| 'bottom-center'
	| 'bottom-right'

const WatermarkTool: React.FC<WatermarkToolProps> = ({
	images,
	processedImages,
	onProcess,
	isProcessing,
	setIsProcessing,
}) => {
	const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text')
	const [text, setText] = useState('Watermark')
	const [watermarkImage, setWatermarkImage] = useState<File | null>(null)
	const [watermarkImageUrl, setWatermarkImageUrl] = useState<string>('')
	const [position, setPosition] = useState<Position>('bottom-right')
	const [opacity, setOpacity] = useState(0.5)
	const [fontSize, setFontSize] = useState(48)
	const [color, setColor] = useState('#ffffff')
	const [fontFamily, setFontFamily] = useState('Arial')
	const [rotation, setRotation] = useState(0)
	const [offsetX, setOffsetX] = useState(20)
	const [offsetY, setOffsetY] = useState(20)
	const [stroke, setStroke] = useState(false)
	const [strokeColor, setStrokeColor] = useState('#000000')
	const [strokeWidth, setStrokeWidth] = useState(2)
	const [imageScale, setImageScale] = useState(1)
	const [tileMode, setTileMode] = useState(false)
	const [tileSpacingX, setTileSpacingX] = useState(150)
	const [tileSpacingY, setTileSpacingY] = useState(150)

	const positions: { value: Position; label: string; icon: string }[] = [
		{ value: 'top-left', label: 'Верх-ліво', icon: '↖️' },
		{ value: 'top-center', label: 'Верх-центр', icon: '⬆️' },
		{ value: 'top-right', label: 'Верх-право', icon: '↗️' },
		{ value: 'center-left', label: 'Центр-ліво', icon: '⬅️' },
		{ value: 'center', label: 'Центр', icon: '⏺️' },
		{ value: 'center-right', label: 'Центр-право', icon: '➡️' },
		{ value: 'bottom-left', label: 'Низ-ліво', icon: '↙️' },
		{ value: 'bottom-center', label: 'Низ-центр', icon: '⬇️' },
		{ value: 'bottom-right', label: 'Низ-право', icon: '↘️' },
	]

	const fontFamilies = [
		'Arial',
		'Helvetica',
		'Times New Roman',
		'Courier New',
		'Verdana',
		'Georgia',
		'Comic Sans MS',
		'Impact',
	]

	const handleWatermarkImageSelect = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0]
		if (file && file.type.startsWith('image/')) {
			setWatermarkImage(file)
			setWatermarkImageUrl(URL.createObjectURL(file))
		}
	}

	const applyWatermark = useCallback(async () => {
		if (watermarkType === 'text' && !text.trim()) {
			alert('Введіть текст водяного знаку')
			return
		}

		if (watermarkType === 'image' && !watermarkImage) {
			alert('Виберіть зображення водяного знаку')
			return
		}

		setIsProcessing(true)

		try {
			const processedImagesArray: ProcessedImage[] = []

			for (let i = 0; i < images.length; i++) {
				const img = processedImages[i] || {
					file: images[i],
					originalSize: images[i].size,
				}

				const image = await new Promise<HTMLImageElement>((resolve, reject) => {
					const loadedImage = new Image()
					loadedImage.onload = () => resolve(loadedImage)
					loadedImage.onerror = reject
					loadedImage.src = img.url || URL.createObjectURL(img.file)
				})

				const canvas = document.createElement('canvas')
				canvas.width = image.width
				canvas.height = image.height
				const ctx = canvas.getContext('2d')!

				ctx.drawImage(image, 0, 0)

				if (watermarkType === 'text') {
					// Text watermark
					ctx.save()
					ctx.globalAlpha = opacity
					ctx.font = `${fontSize}px ${fontFamily}`
					ctx.fillStyle = color

					if (tileMode) {
						// Tile mode: repeat watermark across entire image
						const cols = Math.ceil(canvas.width / tileSpacingX) + 2
						const rows = Math.ceil(canvas.height / tileSpacingY) + 2

						for (let row = 0; row < rows; row++) {
							for (let col = 0; col < cols; col++) {
								ctx.save()

								const x = col * tileSpacingX - tileSpacingX / 2
								const y = row * tileSpacingY - tileSpacingY / 2

								ctx.translate(x, y)
								if (rotation !== 0) {
									ctx.rotate((rotation * Math.PI) / 180)
								}

								ctx.textAlign = 'center'
								ctx.textBaseline = 'middle'

								if (stroke) {
									ctx.strokeStyle = strokeColor
									ctx.lineWidth = strokeWidth
									ctx.strokeText(text, 0, 0)
								}

								ctx.fillText(text, 0, 0)
								ctx.restore()
							}
						}
					} else {
						// Single watermark mode
						ctx.textAlign = position.includes('right')
							? 'right'
							: position.includes('center')
							? 'center'
							: 'left'
						ctx.textBaseline = 'middle'

						const textHeight = fontSize

						let x = 0,
							y = 0
						switch (position) {
							case 'top-left':
								x = offsetX
								y = offsetY + textHeight
								break
							case 'top-center':
								x = canvas.width / 2
								y = offsetY + textHeight
								break
							case 'top-right':
								x = canvas.width - offsetX
								y = offsetY + textHeight
								break
							case 'center-left':
								x = offsetX
								y = canvas.height / 2
								break
							case 'center':
								x = canvas.width / 2
								y = canvas.height / 2
								break
							case 'center-right':
								x = canvas.width - offsetX
								y = canvas.height / 2
								break
							case 'bottom-left':
								x = offsetX
								y = canvas.height - offsetY
								break
							case 'bottom-center':
								x = canvas.width / 2
								y = canvas.height - offsetY
								break
							case 'bottom-right':
								x = canvas.width - offsetX
								y = canvas.height - offsetY
								break
						}

						ctx.translate(x, y)
						if (rotation !== 0) {
							ctx.rotate((rotation * Math.PI) / 180)
						}

						if (stroke) {
							ctx.strokeStyle = strokeColor
							ctx.lineWidth = strokeWidth
							ctx.strokeText(text, 0, 0)
						}

						ctx.fillText(text, 0, 0)
					}
					ctx.restore()
				} else {
					// Image watermark
					const watermark = await new Promise<HTMLImageElement>(
						(resolve, reject) => {
							const wm = new Image()
							wm.onload = () => resolve(wm)
							wm.onerror = reject
							wm.src = watermarkImageUrl
						}
					)

					const wmWidth = watermark.width * imageScale
					const wmHeight = watermark.height * imageScale

					ctx.save()
					ctx.globalAlpha = opacity

					if (tileMode) {
						// Tile mode: repeat watermark image across entire image
						const cols = Math.ceil(canvas.width / tileSpacingX) + 2
						const rows = Math.ceil(canvas.height / tileSpacingY) + 2

						for (let row = 0; row < rows; row++) {
							for (let col = 0; col < cols; col++) {
								ctx.save()

								const x = col * tileSpacingX - tileSpacingX / 2
								const y = row * tileSpacingY - tileSpacingY / 2

								ctx.translate(x + wmWidth / 2, y + wmHeight / 2)
								if (rotation !== 0) {
									ctx.rotate((rotation * Math.PI) / 180)
								}
								ctx.drawImage(
									watermark,
									-wmWidth / 2,
									-wmHeight / 2,
									wmWidth,
									wmHeight
								)
								ctx.restore()
							}
						}
					} else {
						// Single watermark mode
						let x = 0,
							y = 0
						switch (position) {
							case 'top-left':
								x = offsetX
								y = offsetY
								break
							case 'top-center':
								x = (canvas.width - wmWidth) / 2
								y = offsetY
								break
							case 'top-right':
								x = canvas.width - wmWidth - offsetX
								y = offsetY
								break
							case 'center-left':
								x = offsetX
								y = (canvas.height - wmHeight) / 2
								break
							case 'center':
								x = (canvas.width - wmWidth) / 2
								y = (canvas.height - wmHeight) / 2
								break
							case 'center-right':
								x = canvas.width - wmWidth - offsetX
								y = (canvas.height - wmHeight) / 2
								break
							case 'bottom-left':
								x = offsetX
								y = canvas.height - wmHeight - offsetY
								break
							case 'bottom-center':
								x = (canvas.width - wmWidth) / 2
								y = canvas.height - wmHeight - offsetY
								break
							case 'bottom-right':
								x = canvas.width - wmWidth - offsetX
								y = canvas.height - wmHeight - offsetY
								break
						}

						ctx.translate(x + wmWidth / 2, y + wmHeight / 2)
						if (rotation !== 0) {
							ctx.rotate((rotation * Math.PI) / 180)
						}
						ctx.drawImage(
							watermark,
							-wmWidth / 2,
							-wmHeight / 2,
							wmWidth,
							wmHeight
						)
					}
					ctx.restore()
				}

				const blob = await new Promise<Blob>((resolve, reject) => {
					canvas.toBlob(blob => {
						if (blob) resolve(blob)
						else reject(new Error('Failed to create blob'))
					}, img.mimeType || 'image/png')
				})

				const newFile = new File([blob], `watermarked-${img.file.name}`, {
					type: img.mimeType || 'image/png',
				})

				processedImagesArray.push({
					file: newFile,
					originalSize: img.originalSize,
					newSize: blob.size,
					canvas: canvas,
					url: canvas.toDataURL(img.mimeType || 'image/png'),
					mimeType: img.mimeType || 'image/png',
				})
			}

			onProcess(processedImagesArray)
		} catch (error) {
			console.error('Error applying watermark:', error)
			alert('Помилка при додаванні водяного знаку')
		} finally {
			setIsProcessing(false)
		}
	}, [
		text,
		position,
		opacity,
		fontSize,
		color,
		fontFamily,
		rotation,
		offsetX,
		offsetY,
		stroke,
		strokeColor,
		strokeWidth,
		images,
		processedImages,
		onProcess,
		setIsProcessing,
		watermarkType,
		watermarkImage,
		watermarkImageUrl,
		imageScale,
		tileMode,
		tileSpacingX,
		tileSpacingY,
	])

	return (
		<div className='space-y-6'>
			<div className='bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4'>
				<h3 className='text-lg font-semibold mb-3 text-gray-800 dark:text-white'>
					💧 Водяний знак
				</h3>

				<div className='space-y-4'>
					{/* Type selector */}
					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Тип водяного знаку
						</label>
						<div className='flex space-x-3'>
							<button
								onClick={() => setWatermarkType('text')}
								className={`flex-1 py-2 rounded-lg border-2 transition-all text-sm ${
									watermarkType === 'text'
										? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
										: 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
								}`}
							>
								📝 Текст
							</button>
							<button
								onClick={() => setWatermarkType('image')}
								className={`flex-1 py-2 rounded-lg border-2 transition-all text-sm ${
									watermarkType === 'image'
										? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
										: 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
								}`}
							>
								🖼️ Зображення
							</button>
						</div>
					</div>

					{watermarkType === 'text' ? (
						<>
							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Текст водяного знаку
								</label>
								<input
									type='text'
									value={text}
									onChange={e => setText(e.target.value)}
									className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
									placeholder='Введіть текст...'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Розмір шрифту: {fontSize}px
								</label>
								<input
									type='range'
									min='12'
									max='200'
									value={fontSize}
									onChange={e => setFontSize(Number(e.target.value))}
									className='w-full'
								/>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Шрифт
								</label>
								<select
									value={fontFamily}
									onChange={e => setFontFamily(e.target.value)}
									className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
								>
									{fontFamilies.map(font => (
										<option key={font} value={font}>
											{font}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Колір тексту
								</label>
								<div className='flex items-center space-x-3'>
									<input
										type='color'
										value={color}
										onChange={e => setColor(e.target.value)}
										className='h-10 w-20 rounded cursor-pointer'
									/>
									<input
										type='text'
										value={color}
										onChange={e => setColor(e.target.value)}
										className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
										placeholder='#ffffff'
									/>
								</div>
							</div>

							<div className='flex items-center space-x-3'>
								<input
									type='checkbox'
									id='stroke'
									checked={stroke}
									onChange={e => setStroke(e.target.checked)}
									className='w-4 h-4 text-purple-600 rounded'
								/>
								<label
									htmlFor='stroke'
									className='text-sm font-medium text-gray-700 dark:text-gray-300'
								>
									Обведення тексту
								</label>
							</div>

							{stroke && (
								<>
									<div>
										<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
											Колір обведення
										</label>
										<div className='flex items-center space-x-3'>
											<input
												type='color'
												value={strokeColor}
												onChange={e => setStrokeColor(e.target.value)}
												className='h-10 w-20 rounded cursor-pointer'
											/>
											<input
												type='text'
												value={strokeColor}
												onChange={e => setStrokeColor(e.target.value)}
												className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
												placeholder='#000000'
											/>
										</div>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
											Товщина обведення: {strokeWidth}px
										</label>
										<input
											type='range'
											min='1'
											max='10'
											value={strokeWidth}
											onChange={e => setStrokeWidth(Number(e.target.value))}
											className='w-full'
										/>
									</div>
								</>
							)}
						</>
					) : (
						<>
							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Зображення водяного знаку
								</label>
								<input
									type='file'
									accept='image/*'
									onChange={handleWatermarkImageSelect}
									className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
								/>
								{watermarkImageUrl && (
									<div className='mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg'>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={watermarkImageUrl}
											alt='Watermark preview'
											className='max-h-32 mx-auto'
										/>
									</div>
								)}
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Масштаб: {(imageScale * 100).toFixed(0)}%
								</label>
								<input
									type='range'
									min='0.1'
									max='2'
									step='0.1'
									value={imageScale}
									onChange={e => setImageScale(Number(e.target.value))}
									className='w-full'
								/>
							</div>
						</>
					)}

					{/* Tile mode toggle */}
					<div className='border-t border-gray-300 dark:border-gray-600 pt-4'>
						<div className='flex items-center space-x-3 mb-4'>
							<input
								type='checkbox'
								id='tileMode'
								checked={tileMode}
								onChange={e => setTileMode(e.target.checked)}
								className='w-4 h-4 text-purple-600 rounded'
							/>
							<label
								htmlFor='tileMode'
								className='text-sm font-medium text-gray-700 dark:text-gray-300'
							>
								🔲 Режим плитки (повторити по всьому зображенню)
							</label>
						</div>

						{tileMode && (
							<>
								<div>
									<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
										Відстань по горизонталі: {tileSpacingX}px
									</label>
									<input
										type='range'
										min='50'
										max='500'
										step='10'
										value={tileSpacingX}
										onChange={e => setTileSpacingX(Number(e.target.value))}
										className='w-full'
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
										Відстань по вертикалі: {tileSpacingY}px
									</label>
									<input
										type='range'
										min='50'
										max='500'
										step='10'
										value={tileSpacingY}
										onChange={e => setTileSpacingY(Number(e.target.value))}
										className='w-full'
									/>
								</div>

								<div className='text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-2'>
									💡 У режимі плитки водяний знак буде повторюватися по всьому
									зображенню. Налаштуйте відстань між копіями для кращого
									результату.
								</div>
							</>
						)}
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Прозорість: {Math.round(opacity * 100)}%
						</label>
						<input
							type='range'
							min='0'
							max='1'
							step='0.01'
							value={opacity}
							onChange={e => setOpacity(Number(e.target.value))}
							className='w-full'
						/>
					</div>

					{!tileMode && (
						<>
							<div>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
									Позиція
								</label>
								<div className='grid grid-cols-3 gap-2'>
									{positions.map(pos => (
										<button
											key={pos.value}
											onClick={() => setPosition(pos.value)}
											className={`py-2 rounded-lg border-2 transition-all text-sm ${
												position === pos.value
													? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
													: 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
											}`}
										>
											<div className='text-lg'>{pos.icon}</div>
											<div className='text-xs'>{pos.label}</div>
										</button>
									))}
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
										Зміщення X: {offsetX}px
									</label>
									<input
										type='range'
										min='0'
										max='200'
										value={offsetX}
										onChange={e => setOffsetX(Number(e.target.value))}
										className='w-full'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
										Зміщення Y: {offsetY}px
									</label>
									<input
										type='range'
										min='0'
										max='200'
										value={offsetY}
										onChange={e => setOffsetY(Number(e.target.value))}
										className='w-full'
									/>
								</div>
							</div>
						</>
					)}

					<div>
						<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
							Поворот: {rotation}°
						</label>
						<input
							type='range'
							min='-180'
							max='180'
							value={rotation}
							onChange={e => setRotation(Number(e.target.value))}
							className='w-full'
						/>
					</div>

					<button
						onClick={applyWatermark}
						disabled={
							isProcessing ||
							(watermarkType === 'text' && !text.trim()) ||
							(watermarkType === 'image' && !watermarkImage)
						}
						className='w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white py-3 rounded-lg transition-colors font-medium'
					>
						{isProcessing ? '⏳ Обробка...' : '💧 Додати водяний знак'}
					</button>
				</div>
			</div>
		</div>
	)
}

export default WatermarkTool
