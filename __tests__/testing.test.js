import { render, screen, fireEvent } from '@testing-library/react'
import Testing from '../pages/testing'

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }) => {
      return <>{children}</>
    },
  }
})

// Mock next/link
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href }) => {
      return <a href={href}>{children}</a>
    },
  }
})

describe('Testing Page', () => {
  it('renders the page heading', () => {
    render(<Testing />)
    expect(screen.getByText('Video Upload & Processing Testing')).toBeInTheDocument()
  })

  it('only accepts video files', () => {
    render(<Testing />)
    const fileInput = document.querySelector('input[type="file"]')
    
    // Verify the file input exists
    expect(fileInput).toBeInTheDocument()
    
    // Verify it has the accept attribute set to video/*
    expect(fileInput).toHaveAttribute('accept', 'video/*')
  })

  it('shows Load FFmpeg button initially', () => {
    render(<Testing />)
    expect(screen.getByText(/Load FFmpeg/i)).toBeInTheDocument()
  })

  it('displays selected file information when file is selected', () => {
    render(<Testing />)
    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 * 5 }) // 5 MB
    const input = document.querySelector('input[type="file"]')
    
    fireEvent.change(input, { target: { files: [file] } })
    
    expect(screen.getByText(/Selected: test.mp4/i)).toBeInTheDocument()
    expect(screen.getByText(/Size: 5.00 MB/i)).toBeInTheDocument()
  })

  it('renders the file input element', () => {
    render(<Testing />)
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })
})
