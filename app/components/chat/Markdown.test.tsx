import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Markdown } from './Markdown';

// @vitest-environment jsdom

// Mock CodeBlock to avoid shiki dependency
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

// Mock Artifact to avoid Remix/Vite preamble issues
vi.mock('./Artifact', () => ({
  Artifact: () => <div>Artifact</div>,
  openArtifactInWorkbench: vi.fn(),
}));

// Mock ThoughtBox to avoid Remix/Vite preamble issues
vi.mock('./ThoughtBox', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock workbench store to avoid webcontainer issues
vi.mock('~/lib/stores/workbench', () => ({
  workbenchStore: {
    currentView: { get: () => 'code', set: vi.fn() },
    setSelectedFile: vi.fn(),
  },
}));

describe('Markdown Component Stale Closure', () => {
  it('should use fresh props in event handlers even when memoized', () => {
    const initialAppend = vi.fn();
    const updatedAppend = vi.fn();

    // Initial render
    const { rerender } = render(
      <Markdown append={initialAppend} html>
        {`<button data-bolt-quick-action="true" data-type="message" data-message="test">Click me</button>`}
      </Markdown>,
    );

    const button = screen.getByText('Click me');

    // Test initial click
    fireEvent.click(button);
    expect(initialAppend).toHaveBeenCalledTimes(1);
    expect(updatedAppend).not.toHaveBeenCalled();

    // Reset mocks
    initialAppend.mockClear();

    // Rerender with new append function
    rerender(
      <Markdown append={updatedAppend} html>
        {`<button data-bolt-quick-action="true" data-type="message" data-message="test">Click me</button>`}
      </Markdown>,
    );

    // Test click after rerender
    fireEvent.click(button);

    // Expect the NEW function to be called
    expect(updatedAppend).toHaveBeenCalledTimes(1);
    expect(initialAppend).not.toHaveBeenCalled();
  });
});
