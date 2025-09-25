// Скрипт для генерації тестових зображень для демонстрації функціоналу

export const generateTestCanvas = (
	width: number = 400,
	height: number = 300,
	type: 'gradient' | 'pattern' | 'color' = 'gradient'
): HTMLCanvasElement => {
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')

	canvas.width = width
	canvas.height = height

	if (!ctx) return canvas

	switch (type) {
		case 'gradient':
			// Створення градієнта
			const gradient = ctx.createLinearGradient(0, 0, width, height)
			gradient.addColorStop(0, '#ff6b6b')
			gradient.addColorStop(0.5, '#4ecdc4')
			gradient.addColorStop(1, '#45b7d1')
			ctx.fillStyle = gradient
			ctx.fillRect(0, 0, width, height)
			break

		case 'pattern':
			// Створення шахової дошки
			const squareSize = 20
			for (let x = 0; x < width; x += squareSize) {
				for (let y = 0; y < height; y += squareSize) {
					const isEven =
						(Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0
					ctx.fillStyle = isEven ? '#333333' : '#ffffff'
					ctx.fillRect(x, y, squareSize, squareSize)
				}
			}
			break

		case 'color':
			// Однотонний колір з текстом
			ctx.fillStyle = '#3b82f6'
			ctx.fillRect(0, 0, width, height)
			ctx.fillStyle = '#ffffff'
			ctx.font = '24px Arial'
			ctx.textAlign = 'center'
			ctx.fillText('Test Image', width / 2, height / 2)
			break
	}

	return canvas
}

export const canvasToFile = async (
	canvas: HTMLCanvasElement,
	filename: string = 'test.png',
	mimeType: string = 'image/png'
): Promise<File> => {
	return new Promise((resolve, reject) => {
		canvas.toBlob(blob => {
			if (blob) {
				const file = new File([blob], filename, { type: mimeType })
				resolve(file)
			} else {
				reject(new Error('Failed to create blob'))
			}
		}, mimeType)
	})
}
