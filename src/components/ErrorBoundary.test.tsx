/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Lỗi giả lập để kiểm tra ErrorBoundary');
};

describe('ErrorBoundary', () => {
  it('render bình thường children khi không có lỗi', () => {
    render(
      <ErrorBoundary>
        <div>Nội dung bình thường</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Nội dung bình thường')).toBeInTheDocument();
  });

  it('hiển thị màn hình fallback thân thiện khi component con throw lỗi', () => {
    // React logs the error to console during the render pass; silence it so
    // the test output stays clean (the error itself is still asserted below).
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Đã xảy ra lỗi khi hiển thị ứng dụng/)).toBeInTheDocument();
    expect(screen.getByText(/vẫn được lưu an toàn/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải lại trang/ })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
