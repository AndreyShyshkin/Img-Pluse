'use client'

import { useState } from 'react'

const HelpModal: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false)

	const features = [
		{
			title: 'Конвертація форматів',
			description: 'Перетворює зображення між форматами PNG, JPEG і WebP',
			tips: [
				'WebP забезпечує найкращу компресію',
				'PNG підтримує прозорість',
				'JPEG оптимальний для фотографій',
			],
		},
		{
			title: 'Зміна розміру',
			description: 'Масштабує зображення різними способами',
			tips: [
				'За відсотками - рівномірне масштабування',
				'За шириною/висотою зі збереженням пропорцій',
				'Фіксований розмір з можливістю деформації',
			],
		},
		{
			title: 'Перетворення кольорів',
			description: 'Змінює кольори та застосовує фільтри',
			tips: [
				'Заміна кольору з налаштуванням точності',
				'Чорно-білий, сепія, інверсія',
				'Використовуйте малу допустимість для точної заміни',
			],
		},
		{
			title: 'Колірний баланс',
			description: 'Коригує освітлення та кольоровий баланс',
			tips: [
				'Невеликі зміни дають кращий результат',
				'Комбінуйте різні налаштування',
				'Перевіряйте результат перед збереженням',
			],
		},
	]

	if (!isOpen) {
		return (
			<button
				onClick={() => setIsOpen(true)}
				className='fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-colors z-50'
				title='Довідка'
			>
				<span className='text-xl'>❓</span>
			</button>
		)
	}

	return (
		<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
			<div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
				{/* Заголовок */}
				<div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
					<h2 className='text-2xl font-bold text-gray-800 dark:text-white'>
						Довідка по використанню
					</h2>
					<button
						onClick={() => setIsOpen(false)}
						className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl'
					>
						×
					</button>
				</div>

				{/* Контент */}
				<div className='p-6'>
					{/* Загальна інформація */}
					<div className='mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
						<h3 className='text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2'>
							🚀 Як почати роботу
						</h3>
						<ol className='text-blue-700 dark:text-blue-300 space-y-2'>
							<li>
								1. <strong>Завантажте зображення</strong> - перетягніть файли
								або натисніть &ldquo;Вибрати файли&rdquo;
							</li>
							<li>
								2. <strong>Виберіть вкладку</strong> з потрібним типом обробки
							</li>
							<li>
								3. <strong>Налаштуйте параметри</strong> згідно з вашими
								потребами
							</li>
							<li>
								4. <strong>Натисніть кнопку обробки</strong> та дочекайтеся
								результатів
							</li>
							<li>
								5. <strong>Завантажте результат</strong> - одне зображення або
								ZIP архів
							</li>
						</ol>
					</div>

					{/* Функції */}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						{features.map((feature, index) => (
							<div
								key={index}
								className='border border-gray-200 dark:border-gray-700 rounded-lg p-4'
							>
								<h4 className='text-lg font-semibold text-gray-800 dark:text-white mb-2'>
									{feature.title}
								</h4>
								<p className='text-gray-600 dark:text-gray-300 mb-3'>
									{feature.description}
								</p>
								<div className='space-y-1'>
									<strong className='text-sm text-gray-700 dark:text-gray-300'>
										Поради:
									</strong>
									{feature.tips.map((tip, tipIndex) => (
										<div
											key={tipIndex}
											className='text-sm text-gray-600 dark:text-gray-400'
										>
											• {tip}
										</div>
									))}
								</div>
							</div>
						))}
					</div>

					{/* Технічні характеристики */}
					<div className='mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
						<h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-3'>
							🔧 Технічні характеристики
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400'>
							<div>
								<strong>Підтримувані формати:</strong>
								<div>PNG, JPEG, WebP, GIF (вхідні)</div>
								<div>PNG, JPEG, WebP (вихідні)</div>
							</div>
							<div>
								<strong>Максимальні розміри:</strong>
								<div>4000×4000 пікселів</div>
								<div>Рекомендовано до 2000×2000</div>
							</div>
							<div>
								<strong>Пакетна обробка:</strong>
								<div>До 50 файлів одночасно</div>
								<div>Автоматичний ZIP архів</div>
							</div>
							<div>
								<strong>Безпека:</strong>
								<div>Локальна обробка в браузері</div>
								<div>Файли не відправляються на сервер</div>
							</div>
						</div>
					</div>

					{/* Часто задавані питання */}
					<div className='mt-8'>
						<h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-4'>
							❓ Часто задавані питання
						</h3>
						<div className='space-y-4'>
							<details className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
								<summary className='cursor-pointer font-medium text-gray-700 dark:text-gray-300'>
									Чому мої файли стали більшими після обробки?
								</summary>
								<p className='mt-2 text-gray-600 dark:text-gray-400 text-sm'>
									Це може статися при конвертації з форматів з втратами (JPEG) в
									формати без втрат (PNG), або при збільшенні якості/розміру.
									Спробуйте WebP для оптимального стиску.
								</p>
							</details>

							<details className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
								<summary className='cursor-pointer font-medium text-gray-700 dark:text-gray-300'>
									Які налаштування найкращі для веб-сайту?
								</summary>
								<p className='mt-2 text-gray-600 dark:text-gray-400 text-sm'>
									WebP формат з якістю 80-90% або JPEG з якістю 85%. Для
									зменшення розміру спробуйте масштабування до 1920px по більшій
									стороні.
								</p>
							</details>

							<details className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
								<summary className='cursor-pointer font-medium text-gray-700 dark:text-gray-300'>
									Чому деякі кольори не замінюються?
								</summary>
								<p className='mt-2 text-gray-600 dark:text-gray-400 text-sm'>
									Спробуйте збільшити значення &ldquo;Допустимість&rdquo;.
									Цифрові зображення рідко мають точно однакові кольори.
								</p>
							</details>
						</div>
					</div>
				</div>

				{/* Футер */}
				<div className='p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end'>
					<button
						onClick={() => setIsOpen(false)}
						className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors'
					>
						Зрозуміло
					</button>
				</div>
			</div>
		</div>
	)
}

export default HelpModal
