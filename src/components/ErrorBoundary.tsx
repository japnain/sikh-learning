import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary caught:', error, info.componentStack) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center mt-20">
          <p className="text-ink font-medium mb-2">Something went wrong</p>
          <button onClick={() => this.setState({ hasError: false })} className="text-saffron text-sm">Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
