import { ReactNode, useState } from 'react'

interface TooltipProps {
  children: ReactNode
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ children, text, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
    }
  }

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900'
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900'
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900'
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900'
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900'
    }
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 ${getPositionClasses()} pointer-events-none`}
          style={{ animation: 'fadeIn 0.2s ease-in-out' }}
        >
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            {text}
            <div
              className={`absolute w-0 h-0 border-4 border-transparent ${getArrowClasses()}`}
            />
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px) translateX(-50%);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}