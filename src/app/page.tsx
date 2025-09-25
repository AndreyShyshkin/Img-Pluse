'use client'

import ImageProcessor from '@/components/ImageProcessor'

export default function Home() {
	return (
		<div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
			<div className='container mx-auto px-4 py-8'>
				<header className='text-center mb-12'>
					<h1 className='text-4xl font-bold text-gray-800 dark:text-white mb-4'>
						Обробка зображень
					</h1>
				</header>

				<ImageProcessor />
			</div>
		</div>
	)
}
