/**
 * Runtime React Bridge Shim for Sami Cloud Updater
 * Binds directly to the active React 19 instance (`window.__SamiReact`) inside Sami's main bundle
 * so hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`) share the exact fiber dispatcher.
 */

const getHostReact = (): any => {
  const w = typeof window !== 'undefined' ? (window as any) : {};
  if (!w.__SamiReact) {
    throw new Error('Sami host React instance is not initialized yet');
  }
  return w.__SamiReact;
};

export const createElement = (...args: any[]) => getHostReact().createElement(...args);
export const Fragment = Symbol.for('react.fragment');
export const useState = <T = any>(initial?: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] =>
  getHostReact().useState(initial);
export const useEffect = (effect: () => void | (() => void), deps?: any[]): void =>
  getHostReact().useEffect(effect, deps);
export const useRef = <T = any>(initial: T): { current: T } => getHostReact().useRef(initial);
export const useCallback = <T extends (...args: any[]) => any>(cb: T, deps: any[]): T =>
  getHostReact().useCallback(cb, deps);
export const useMemo = <T = any>(factory: () => T, deps: any[]): T =>
  getHostReact().useMemo(factory, deps);

const ReactShim = {
  createElement,
  Fragment,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
};

export default ReactShim;
