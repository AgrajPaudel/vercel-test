import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Home', () => {
  it('renders the main heading', () => {
    render(<Home />)
    const heading = screen.getByText('AI Image Generation')
    expect(heading).toBeInTheDocument()
  })

  it('renders the start creating button', () => {
    render(<Home />)
    const button = screen.getByText('Start Creating')
    expect(button).toBeInTheDocument()
  })
})