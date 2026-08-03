/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches uncaught errors anywhere in the render tree so the app shows a
 * friendly, reassuring screen instead of a blank white page. Dữ liệu vẫn còn
 * nguyên trong IndexedDB vì lỗi hiển thị không xoá dữ liệu đã lưu — chỉ cần
 * tải lại trang.
 */
export default class ErrorBoundary extends Component<Props, State> {
  declare props: Readonly<Props>;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lỗi không mong muốn trong ứng dụng:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f2ec] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-[#0f2444] mb-2">
            Đã xảy ra lỗi khi hiển thị ứng dụng
          </h1>
          <p className="text-sm text-slate-600 mb-1">
            Dữ liệu của bạn <span className="font-semibold">vẫn được lưu an toàn</span> trong trình duyệt.
            Lỗi này chỉ ảnh hưởng đến giao diện hiển thị.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Hãy thử tải lại trang. Nếu lỗi vẫn tiếp diễn, hãy xuất dữ liệu ra Excel để sao lưu và liên hệ người quản trị hệ thống.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f2444] text-white text-sm font-semibold hover:bg-[#183769] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tải lại trang
          </button>

          {this.state.error && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-slate-400 cursor-pointer select-none">
                Chi tiết lỗi (dành cho kỹ thuật)
              </summary>
              <pre className="mt-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
