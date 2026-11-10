import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert" className="m-6 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">This page could not load</h1>
        <p className="mt-2 text-sm text-slate-600">Reload to try again, or use the menu to open another page.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Reload page</button>
      </section>
    );
  }
}
