import { render, screen } from '@testing-library/react'
import StreakBadge from './StreakBadge'

test('renders streak count', () => {
  render(<StreakBadge streak={7} />)
  expect(screen.getByText(/7 day/)).toBeInTheDocument()
})

test('renders singular day for streak of 1', () => {
  render(<StreakBadge streak={1} />)
  expect(screen.getByText('1 day')).toBeInTheDocument()
})

test('renders plural days for streak > 1', () => {
  render(<StreakBadge streak={5} />)
  expect(screen.getByText('5 days')).toBeInTheDocument()
})
