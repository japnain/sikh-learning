import { beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SplashScreen from './SplashScreen'

beforeEach(() => {
  sessionStorage.clear()
})

test('renders the NaamRas splash identity on first load', () => {
  render(<SplashScreen />)

  expect(screen.getByText(/^NaamRas$/)).toBeInTheDocument()
  expect(screen.getByText(/^Naamras\.xyz$/)).toBeInTheDocument()
  expect(screen.getByText(/Read\. Reflect\. Return\./i)).toBeInTheDocument()
})
