import { AsyncLocalStorage } from 'node:async_hooks';
type ExecutionContext = { waitUntil: (promise: Promise<unknown>) => void };
const contexts = new AsyncLocalStorage<ExecutionContext | undefined>();
export function withExecutionContext<T>(ctx: unknown, run: () => T): T {
  const value = ctx && typeof ctx === 'object' && 'waitUntil' in ctx && typeof ctx.waitUntil === 'function' ? ctx as ExecutionContext : undefined;
  return contexts.run(value, run);
}
export function runBackground(task: Promise<unknown>) {
  const ctx = contexts.getStore();
  // The local development server has no request lifetime cancellation.
  if (ctx) ctx.waitUntil(task);
  else void task;
}