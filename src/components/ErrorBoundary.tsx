import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center mt-20">
          <p className="text-white font-medium mb-2">Something went wrong</p>
          <button onClick={() => this.setState({ hasError: false })} className="text-[#C9A84C] text-sm">Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
