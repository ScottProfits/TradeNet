// In-app page history, recorded by ConditionalShell on every route change.
// Lets back buttons tell a real previous page apart from the sign-in flow
// (going "back" into /sign-in just bounces a signed-in user forward again).
const stack: string[] = [];

export function recordPath(pathname: string) {
  if (stack[stack.length - 1] !== pathname) stack.push(pathname);
}

/** True when the previous in-app page is somewhere it makes sense to go back to. */
export function canGoBack(): boolean {
  const prev = stack[stack.length - 2];
  return !!prev && !/^\/(sign-in|sign-up|onboarding)(\/|$)/.test(prev);
}
