/**
 * This class provides thread-local variables. 
 * 
 * These variables differ from their normal counterparts in that each thread that accesses one (via its get or set method) 
 * has its own, independently initialized copy of the variable. ThreadLocal instances are typically private static fields 
 * in classes that wish to associate state with a thread (e.g., a user ID or Transaction ID).
 */
 interface ThreadLocal<T> {
    /**
     * Returns the value in the current thread's copy of this thread-local variable.
     */
    get(): T | null;

    /**
     * Sets the current thread's copy of this thread-local variable to the specified value.
     * @param value     The value.
     */
    set(value: T): void;
}