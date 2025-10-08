import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Testing from '../pages/testing';

// --- Mocking components and ffmpeg as we are only testing error handling ---
jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }) => <a>{children}</a>,
}));

const mockExec = jest.fn(); // configure per-test
const mockLoad = jest.fn().mockResolvedValue(true);

jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    load: mockLoad,
    exec: mockExec,
    writeFile: jest.fn().mockResolvedValue(true),
    readFile: jest.fn().mockResolvedValue(new Uint8Array()),
  })),
}));
jest.mock('@ffmpeg/util', () => ({
  fetchFile: jest.fn().mockResolvedValue(new Uint8Array()),
  toBlobURL: jest.fn().mockResolvedValue('mock-url'),
}));

describe('Testing Component - Compression Failure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display an error message if ffmpeg.exec fails', async () => {
    // Configure the mock to simulate a failure
    const errorMessage = 'FFmpeg exited with non-zero code';
    mockExec.mockRejectedValue(new Error(errorMessage)); // Tell the mock to throw an error

    render(<Testing />);
    
    // Load the library
    fireEvent.click(screen.getByRole('button', { name: /load ffmpeg/i }));
    const processButton = await screen.findByRole('button', { name: /process video/i });

    // Select a file
    const inputFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [inputFile] } });

    // Click process, which we expect to fail
    fireEvent.click(processButton);

    // Finding the error message defined in the component's catch block.
    const errorDisplay = await screen.findByText(/an error occurred during compression/i);
    expect(errorDisplay).toBeInTheDocument();

    // Ensure the button is no longer disabled, because the 'finally' block should run
    expect(processButton).not.toBeDisabled();
  });
});
