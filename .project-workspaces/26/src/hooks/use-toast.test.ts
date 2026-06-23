import { describe, it, expect } from 'vitest';
import { reducer } from './use-toast';

describe('toast reducer', () => {
  const initialState = { toasts: [] };

  it('should add a toast', () => {
    const toast = {
      id: '1',
      title: 'Test Toast',
      open: true,
    };

    const result = reducer(initialState, {
      type: 'ADD_TOAST',
      toast,
    });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].title).toBe('Test Toast');
  });

  it('should update a toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Original', open: true }],
    };

    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });

    expect(result.toasts[0].title).toBe('Updated');
  });

  it('should remove a toast', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(state, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('should remove all toasts when no id provided', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    };

    const result = reducer(state, {
      type: 'REMOVE_TOAST',
      toastId: undefined,
    });

    expect(result.toasts).toHaveLength(0);
  });

  it('should limit toasts to 1', () => {
    const state = { toasts: [] };

    let result = reducer(state, {
      type: 'ADD_TOAST',
      toast: { id: '1', title: 'Toast 1', open: true },
    });

    result = reducer(result, {
      type: 'ADD_TOAST',
      toast: { id: '2', title: 'Toast 2', open: true },
    });

    // TOAST_LIMIT is 1, so only the latest toast should remain
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });
});
