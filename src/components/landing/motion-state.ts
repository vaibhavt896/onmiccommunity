"use client";

import { useSyncExternalStore } from "react";

/** One global "pause motion" switch (WCAG 2.2.2): GSAP loops, CSS loops and the hero film. */
type MotionState = { paused: boolean };

let state: MotionState = { paused: false };
const listeners = new Set<() => void>();

export function getMotionState(): MotionState {
  return state;
}

export function setMotionState(p: Partial<MotionState>) {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}

export function subscribeMotion(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useMotionState() {
  return useSyncExternalStore(subscribeMotion, getMotionState, getMotionState);
}
