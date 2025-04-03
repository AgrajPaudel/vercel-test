import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthForm } from '@/components/auth/auth-form'
import { createClient } from '@/lib/supabase'

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  })),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}))

describe('AuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders sign up form correctly', () => {
    render(<AuthForm mode="signup" />)
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('renders sign in form correctly', () => {
    render(<AuthForm mode="signin" />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('validates email format', async () => {
    render(<AuthForm mode="signup" />)
    
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    
    const submitButton = screen.getByRole('button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    render(<AuthForm mode="signup" />)
    
    const passwordInput = screen.getByLabelText('Password')
    fireEvent.change(passwordInput, { target: { value: '123' } })
    
    const submitButton = screen.getByRole('button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    })
  })
})