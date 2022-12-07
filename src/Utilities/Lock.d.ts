/**
 * An interface describing a java lock.
 */
 interface Lock {
    /**
     * Acquires the lock.
     */
    lock(): void;

    /**
     * Releases the lock.
     */
    unlock(): void;
}