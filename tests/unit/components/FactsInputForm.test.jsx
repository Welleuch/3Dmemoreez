import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FactsInputForm from '@/components/FactsInputForm';

describe('FactsInputForm', () => {
  const mockOnGenerate = vi.fn();

  it('should render all three hobby input fields', () => {
    render(<FactsInputForm onGenerate={mockOnGenerate} />);

    expect(screen.getByPlaceholderText(/first hobby/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/second hobby/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/third hobby/i)).toBeInTheDocument();
  });

  it('should render the submit button', () => {
    render(<FactsInputForm onGenerate={mockOnGenerate} />);

    expect(screen.getByRole('button', { name: /crystallize/i })).toBeInTheDocument();
  });

  it('should disable submit button when fields are empty', () => {
    render(<FactsInputForm onGenerate={mockOnGenerate} />);

    const submitButton = screen.getByRole('button', { name: /crystallize/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when all fields are filled', async () => {
    const user = userEvent.setup();
    render(<FactsInputForm onGenerate={mockOnGenerate} />);

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Photography');
    await user.type(inputs[1], 'Hiking');
    await user.type(inputs[2], 'Cooking');

    const submitButton = screen.getByRole('button', { name: /crystallize/i });
    expect(submitButton).toBeEnabled();
  });

  it('should call onGenerate with hobbies when form is submitted', async () => {
    const user = userEvent.setup();
    render(<FactsInputForm onGenerate={mockOnGenerate} />);

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Photography');
    await user.type(inputs[1], 'Hiking');
    await user.type(inputs[2], 'Cooking');

    const submitButton = screen.getByRole('button', { name: /crystallize/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalledWith([
        'Photography',
        'Hiking',
        'Cooking',
      ]);
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    const slowOnGenerate = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<FactsInputForm onGenerate={slowOnGenerate} />);

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Photography');
    await user.type(inputs[1], 'Hiking');
    await user.type(inputs[2], 'Cooking');

    const submitButton = screen.getByRole('button', { name: /crystallize/i });
    await user.click(submitButton);

    // Check for loading state (button should be disabled or show loading text)
    expect(submitButton).toBeDisabled();
  });

  it('should trim whitespace from inputs', async () => {
    const user = userEvent.setup();
    render(<FactsInputForm onGenerate={mockOnGenerate} />);

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], '  Photography  ');
    await user.type(inputs[1], '  Hiking  ');
    await user.type(inputs[2], '  Cooking  ');

    const submitButton = screen.getByRole('button', { name: /crystallize/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalledWith([
        'Photography',
        'Hiking',
        'Cooking',
      ]);
    });
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const errorOnGenerate = vi.fn(() => Promise.reject(new Error('API Error')));
    
    render(<FactsInputForm onGenerate={errorOnGenerate} />);

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Photography');
    await user.type(inputs[1], 'Hiking');
    await user.type(inputs[2], 'Cooking');

    const submitButton = screen.getByRole('button', { name: /crystallize/i });
    await user.click(submitButton);

    // Should show error message or re-enable button
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });
});
