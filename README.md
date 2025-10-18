This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

This project uses **Jest** and **React Testing Library** for unit testing the Next.js frontend components.

### Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs automatically on file changes)
pnpm test -- --watch

# Run tests with coverage report
pnpm test -- --coverage

# Run a specific test file
pnpm test testing.test.js
```

### Test Structure

Tests are located in the `__tests__/` directory:
- `__tests__/testing.test.js` - Tests for the video upload/processing page
- `__tests__/index.test.js` - Tests for the home page (add your own!)

### Writing Your Own Tests

Here's a basic example of how to write a test:

```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '../pages/MyComponent'

// Mock Next.js components if needed
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }) => <>{children}</>,
  }
})

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Some Text')).toBeInTheDocument()
  })

  it('handles button click', () => {
    render(<MyComponent />)
    const button = screen.getByText('Click Me')
    fireEvent.click(button)
    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### When to Run Tests

- ✅ **Before committing code** - Ensure your changes don't break existing functionality
- ✅ **After pulling changes** - Verify the codebase still works after merging
- ✅ **When adding new features** - Write tests for new components/functionality
- ✅ **Before creating a PR** - Make sure all tests pass

### Test Configuration Files

- **`jest.config.js`** - Main Jest configuration with Next.js integration
- **`jest.setup.js`** - Setup file that loads testing library matchers

### Common Testing Patterns

**Testing text content:**
```javascript
expect(screen.getByText('Hello World')).toBeInTheDocument()
```

**Testing user input:**
```javascript
const input = screen.getByRole('textbox')
fireEvent.change(input, { target: { value: 'test' } })
expect(input.value).toBe('test')
```

**Testing button clicks:**
```javascript
const button = screen.getByRole('button')
fireEvent.click(button)
```

**Testing file uploads:**
```javascript
const file = new File(['content'], 'test.mp4', { type: 'video/mp4' })
const input = document.querySelector('input[type="file"]')
fireEvent.change(input, { target: { files: [file] } })
```

### Useful Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Next.js Apps](https://nextjs.org/docs/testing)
- [Common Testing Library Queries](https://testing-library.com/docs/queries/about)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
