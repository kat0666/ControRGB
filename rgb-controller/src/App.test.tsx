import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildEvent } from './App';

describe('buildEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1675252800000));
    vi.spyOn(global.Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should create an event with default neutral tone', () => {
    const event = buildEvent('Hello world');
    expect(event).toEqual({
      id: 1675252800500, // Date.now() + 500
      message: 'Hello world',
      tone: 'neutral',
    });
  });

  it('should create an event with specified tone', () => {
    const event = buildEvent('Warning message', 'warn');
    expect(event).toEqual({
      id: 1675252800500,
      message: 'Warning message',
      tone: 'warn',
    });
  });

  it('should handle empty message', () => {
    const event = buildEvent('');
    expect(event).toEqual({
      id: 1675252800500,
      message: '',
      tone: 'neutral',
    });
  });

  it('should generate unique ids with different Math.random values', () => {
    vi.spyOn(global.Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);

    const event1 = buildEvent('msg1');
    const event2 = buildEvent('msg2');

    expect(event1.id).toBe(1675252800100);
    expect(event2.id).toBe(1675252800900);
    expect(event1.id).not.toBe(event2.id);
  });
});
