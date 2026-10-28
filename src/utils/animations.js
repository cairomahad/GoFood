/**
 * Глобальные настройки анимаций для плавности на мобильных
 */

// Плавные easing функции
export const easings = {
  smooth: [0.25, 0.1, 0.25, 1], // cubic-bezier для плавности
  spring: { type: 'spring', damping: 25, stiffness: 120 },
  springGentle: { type: 'spring', damping: 30, stiffness: 100 },
  tween: { type: 'tween', duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
}

// Варианты анимаций для списков (Feed, Cards)
export const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 30
  },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 100,
      delay: i * 0.05 // Плавная задержка между элементами
    }
  })
}

// Модальные окна
export const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 200,
      duration: 0.4
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

// Overlay (фон модальных окон)
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

// Карточки (FoodCard, RecipeCard)
export const cardHover = {
  scale: 1.02,
  y: -4,
  transition: {
    type: 'spring',
    damping: 20,
    stiffness: 300
  }
}

// Кнопки
export const buttonTap = {
  scale: 0.97,
  transition: {
    type: 'spring',
    damping: 15,
    stiffness: 400
  }
}

// Sidebar slide
export const sidebarVariants = {
  hidden: { x: -300, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 150
    }
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
}

// Stagger для списков (Feed items)
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // Задержка между карточками
      delayChildren: 0.1
    }
  }
}

// Fade in (простое появление)
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4 }
  }
}

// Scale in (для иконок, аватаров)
export const scaleIn = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 200
    }
  }
}
