/**
 * An interface that describes the java bridge object returned by the profiler java bridge
 * thing, granting the profiler access to various java objects and classes.
 */
interface BMProfilerJavaBridge {
    
    /**
     * Constructs and returns a new `ThreadLocal` object.
     */
    createThreadLocal<T>(): ThreadLocal<T>;

    /**
     * Returns the number of the current thread.
     */
    threadNumber(): number;

    /**
     * Returns a time snapshot in arbitrary time.
     */
    snapshot(): number;

    /**
     * Constructs and returns a new `Lock` object.
     */
    createLock(): Lock;

}