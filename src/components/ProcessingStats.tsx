'use client'

import { ProcessedImage } from './ImageProcessor'

interface ProcessingStatsProps {
	processedImages: ProcessedImage[]
}

const ProcessingStats: React.FC<ProcessingStatsProps> = ({
	processedImages,
}) => {
	if (processedImages.length === 0) return null

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const calculateCompression = (originalSize: number, newSize: number) => {
		if (originalSize === 0) return { percentage: 0, saved: 0 }

		const saved = originalSize - newSize
		const percentage = Math.round((saved / originalSize) * 100)

		return { percentage, saved }
	}

	const totalOriginalSize = processedImages.reduce(
		(sum, img) => sum + img.originalSize,
		0
	)
	const totalNewSize = processedImages.reduce(
		(sum, img) => sum + (img.newSize || 0),
		0
	)
	const { percentage, saved } = calculateCompression(
		totalOriginalSize,
		totalNewSize
	)

	const averageCompression = processedImages
		.filter(img => img.newSize)
		.map(img => calculateCompression(img.originalSize, img.newSize!).percentage)
		.reduce((sum, comp, _, arr) => sum + comp / arr.length, 0)

	const getCompressionColor = (percentage: number) => {
		if (percentage > 50) return 'text-green-600 dark:text-green-400'
		if (percentage > 20) return 'text-yellow-600 dark:text-yellow-400'
		if (percentage < 0) return 'text-red-600 dark:text-red-400'
		return 'text-gray-600 dark:text-gray-400'
	}

	return (
		<div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
			<h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center'>
				<span className='mr-2'>📊</span>
				Статистика обробки
			</h3>

			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
				<div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4'>
					<div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
						{processedImages.length}
					</div>
					<div className='text-sm text-blue-800 dark:text-blue-300'>
						Файлів оброблено
					</div>
				</div>

				<div className='bg-green-50 dark:bg-green-900/20 rounded-lg p-4'>
					<div
						className={`text-2xl font-bold ${getCompressionColor(percentage)}`}
					>
						{percentage > 0 ? '-' : percentage < 0 ? '+' : ''}
						{Math.abs(percentage)}%
					</div>
					<div className='text-sm text-green-800 dark:text-green-300'>
						{saved > 0 ? 'Заощаджено' : 'Збільшено'}
						<br />
						<span className='font-medium'>
							{formatFileSize(Math.abs(saved))}
						</span>
					</div>
				</div>

				<div className='bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4'>
					<div
						className={`text-2xl font-bold ${getCompressionColor(
							averageCompression
						)}`}
					>
						{averageCompression > 0 ? '-' : ''}
						{Math.abs(Math.round(averageCompression))}%
					</div>
					<div className='text-sm text-purple-800 dark:text-purple-300'>
						Середня компресія
					</div>
				</div>

				<div className='bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4'>
					<div className='text-lg font-bold text-orange-600 dark:text-orange-400'>
						{formatFileSize(totalOriginalSize)}
					</div>
					<div className='text-xs text-orange-800 dark:text-orange-300'>→</div>
					<div className='text-lg font-bold text-orange-600 dark:text-orange-400'>
						{formatFileSize(totalNewSize)}
					</div>
					<div className='text-sm text-orange-800 dark:text-orange-300'>
						Розмір файлів
					</div>
				</div>
			</div>

			{processedImages.length > 1 && (
				<details className='mt-6'>
					<summary className='cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'>
						Детальна статистика по файлам
					</summary>
					<div className='mt-4 space-y-2'>
						{processedImages.map((image, index) => {
							const compression = calculateCompression(
								image.originalSize,
								image.newSize || image.originalSize
							)
							return (
								<div
									key={index}
									className='flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded'
								>
									<span className='text-sm text-gray-700 dark:text-gray-300 truncate flex-1'>
										{image.file.name}
									</span>
									<div className='text-sm text-right ml-4'>
										<div className='text-gray-600 dark:text-gray-400'>
											{formatFileSize(image.originalSize)} →{' '}
											{formatFileSize(image.newSize || image.originalSize)}
										</div>
										<div
											className={`text-xs ${getCompressionColor(
												compression.percentage
											)}`}
										>
											{compression.percentage > 0
												? '-'
												: compression.percentage < 0
												? '+'
												: ''}
											{Math.abs(compression.percentage)}%
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</details>
			)}

			<div className='mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
				<h4 className='text-sm font-semibold text-gray-800 dark:text-white mb-2'>
					💡 Поради з оптимізації
				</h4>
				<ul className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
					<li>• WebP формат забезпечує кращу компресію ніж JPEG</li>
					<li>• Для зображень з прозорістю використовуйте PNG</li>
					<li>• Зменшення розміру на 25-50% часто непомітне для ока</li>
					<li>• Для веб-сайтів оптимальна якість JPEG: 80-90%</li>
				</ul>
			</div>
		</div>
	)
}

export default ProcessingStats
