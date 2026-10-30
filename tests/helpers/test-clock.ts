/**
 * Clock abstraction for deterministic time-dependent operations and tests.
 */
export interface IClock {
  now(): Date;
  nowIso(): string;
  nowMs(): number;
}

/**
 * System Clock implementation using the real system time.
 */
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return new Date().toISOString();
  }

  nowMs(): number {
    return Date.now();
  }
}

/**
 * Deterministic Test Clock for unit and integration testing.
 * Allows fixing and advancing time deterministically.
 */
export class TestClock implements IClock {
  private _currentTime: Date;

  constructor(initialTime: Date | string = "2026-10-06T00:00:00.000Z") {
    this._currentTime = typeof initialTime === "string" ? new Date(initialTime) : new Date(initialTime.getTime());
  }

  now(): Date {
    return new Date(this._currentTime.getTime());
  }

  nowIso(): string {
    return this._currentTime.toISOString();
  }

  nowMs(): number {
    return this._currentTime.getTime();
  }

  /**
   * Advances the clock by a specified number of milliseconds.
   */
  advanceMilliseconds(ms: number): void {
    this._currentTime = new Date(this._currentTime.getTime() + ms);
  }

  /**
   * Advances the clock by a specified number of seconds.
   */
  advanceSeconds(seconds: number): void {
    this.advanceMilliseconds(seconds * 1000);
  }

  /**
   * Sets the clock to a specific fixed time.
   */
  setTime(time: Date | string): void {
    this._currentTime = typeof time === "string" ? new Date(time) : new Date(time.getTime());
  }
}
