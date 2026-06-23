import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button component', () => {
  it('should render with default variant', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button')).toHaveTextContent('Click me');
  });

  it('should render different variants', () => {
    const { getByRole, rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="outline">Outline</Button>);
    expect(getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="link">Link</Button>);
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('should render different sizes', () => {
    const { getByRole, rerender } = render(<Button size="sm">Small</Button>);
    expect(getByRole('button')).toBeInTheDocument();

    rerender(<Button size="lg">Large</Button>);
    expect(getByRole('button')).toBeInTheDocument();

    rerender(<Button size="icon">Icon</Button>);
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    expect(getByRole('button')).toBeDisabled();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    let clicked = false;
    const { getByRole } = render(<Button onClick={() => (clicked = true)}>Click me</Button>);

    await user.click(getByRole('button'));
    expect(clicked).toBe(true);
  });

  it('should render as child element when asChild is true', () => {
    const { getByRole } = render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    expect(getByRole('link')).toHaveTextContent('Link Button');
  });
});
