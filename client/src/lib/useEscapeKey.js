import { useEffect, useRef } from 'react';

// Stack of open modals so Escape only closes the topmost one (e.g. ATSScorer over JobDetail)
const stack = [];

const handleKeyDown = (e) => {
    if (e.key !== 'Escape' || stack.length === 0) return;
    e.preventDefault();
    stack[stack.length - 1].current?.();
};

export function useEscapeKey(onEscape, active = true) {
    const callbackRef = useRef(onEscape);
    callbackRef.current = onEscape;

    useEffect(() => {
        if (!active) return;
        if (stack.length === 0) window.addEventListener('keydown', handleKeyDown);
        stack.push(callbackRef);
        return () => {
            stack.splice(stack.indexOf(callbackRef), 1);
            if (stack.length === 0) window.removeEventListener('keydown', handleKeyDown);
        };
    }, [active]);
}
