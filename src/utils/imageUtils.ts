/**
 * Утиліти для роботи з зображеннями
 */

/**
 * Конвертує hex колір в RGB
 */
export const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
		  }
		: null
}

/**
 * Конвертує RGB в hex
 */
export const rgbToHex = (r: number, g: number, b: number) => {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

/**
 * Обчислює відстань між двома кольорами в RGB просторі
 */
export const colorDistance = (
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

/**
 * Форматує розмір файлу в зручний для читання вигляд
 */
export const formatFileSize = (bytes: number) => {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Завантажує зображення як HTML Image елемент
 */
export const loadImage = (file: File): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = URL.createObjectURL(file)
	})
}

/**
 * Створює canvas з зображення
 */
export const imageToCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')

	canvas.width = img.width
	canvas.height = img.height

	if (ctx) {
		ctx.drawImage(img, 0, 0)
	}

	return canvas
}

/**
 * Конвертує canvas в blob
 */
export const canvasToBlob = (
	canvas: HTMLCanvasElement,
	mimeType: string = 'image/png',
	quality?: number
): Promise<Blob | null> => {
	return new Promise(resolve => {
		canvas.toBlob(resolve, mimeType, quality)
	})
}

/**
 * Перевіряє, чи є файл зображенням
 */
export const isImageFile = (file: File): boolean => {
	return file.type.startsWith('image/')
}

/**
 * Отримує підтримувані формати зображень
 */
export const getSupportedImageFormats = () => {
	return [
		{ mime: 'image/png', extension: '.png', name: 'PNG' },
		{ mime: 'image/jpeg', extension: '.jpg', name: 'JPEG' },
		{ mime: 'image/webp', extension: '.webp', name: 'WebP' },
		{ mime: 'image/gif', extension: '.gif', name: 'GIF' },
	]
}

/**
 * Обчислює економію файлового простору
 */
export const calculateCompression = (originalSize: number, newSize: number) => {
	if (originalSize === 0) return { percentage: 0, saved: 0 }

	const saved = originalSize - newSize
	const percentage = Math.round((saved / originalSize) * 100)

	return { percentage, saved }
}

/**
 * Генерує унікальне ім'я файлу
 */
export const generateFileName = (
	originalName: string,
	suffix: string,
	extension?: string
) => {
	const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
	const ext = extension || originalName.split('.').pop() || ''
	return `${nameWithoutExt}_${suffix}.${ext}`
}

/**
 * Перевіряє максимальні розміри зображення
 */
export const validateImageDimensions = (
	width: number,
	height: number,
	maxSize = 4000
) => {
	if (width > maxSize || height > maxSize) {
		return {
			valid: false,
			message: `Максимальний розмір зображення: ${maxSize}x${maxSize} пікселів`,
		}
	}
	return { valid: true }
}

/**
 * Обчислює оптимальний розмір для превью
 */
export const calculatePreviewSize = (
	width: number,
	height: number,
	maxSize = 200
) => {
	const aspectRatio = width / height

	if (width > height) {
		return {
			width: Math.min(width, maxSize),
			height: Math.min(width, maxSize) / aspectRatio,
		}
	} else {
		return {
			width: Math.min(height, maxSize) * aspectRatio,
			height: Math.min(height, maxSize),
		}
	}
}
