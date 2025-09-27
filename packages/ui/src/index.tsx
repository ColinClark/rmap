// Re-export commonly used UI components
// For now, we'll keep components in apps/web and gradually move them here
// This allows us to start with the monorepo structure without breaking existing code

export * from './button'
export * from './card'
export * from './input'
export * from './label'
export * from './alert'

// Export a test component to verify the package works
export const TestComponent = () => {
  return <div>UI Package is working!</div>
}