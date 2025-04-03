import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileUpload } from '@/components/upload/file-upload'
import { createClient } from '@/lib/supabase'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id' }
          }
        }
      })
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' } }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'test-url' } })
      }))
    }
  }))
}))

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false
  })
}))

describe('FileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders upload component', () => {
    render(<FileUpload />)
    expect(screen.getByText(/Drag & drop your image here/i)).toBeInTheDocument()
  })

  it('handles file upload success', async () => {
    const onUploadComplete = jest.fn()
    render(<FileUpload onUploadComplete={onUploadComplete} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByRole('presentation')

    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

    // Mock image dimensions
    const img = document.createElement('img')
    Object.defineProperty(img, 'width', { value: 1024 })
    Object.defineProperty(img, 'height', { value: 1024 })
    jest.spyOn(window, 'Image').mockImplementation(() => img)

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('test-url')
    })
  })

  it('handles file size validation', async () => {
    render(<FileUpload />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByRole('presentation')

    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }) // 6MB

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Maximum file size is 5MB/i)).toBeInTheDocument()
    })
  })

  it('handles file type validation', async () => {
    render(<FileUpload />)

    const file = new File(['test'], 'test.gif', { type: 'image/gif' })
    const input = screen.getByRole('presentation')

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Please upload a JPG or PNG file/i)).toBeInTheDocument()
    })
  })

  it('disables upload when specified', () => {
    render(<FileUpload disabled />)
    const uploadArea = screen.getByRole('presentation')
    expect(uploadArea).toHaveClass('opacity-50')
    expect(uploadArea).toHaveClass('cursor-not-allowed')
  })
})