package com.bogdanmihaiciuc.profiler;

import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

/**
 * The java bridge is used to access several java features from the profiler javascript code.
 */
public class BMProfilerJavaBridge {

    public BMProfilerJavaBridge() {}

    /**
     * Constructs and returns a thread local.
     * @return      A `ThreadLocal`.
     */
    public ThreadLocal createThreadLocal() {
        return new ThreadLocal();
    }

    /**
     * Returns the number of the current thread.
     * @return      A number.
     */
    public long threadNumber() {
        return Thread.currentThread().getId();
    }

    /**
     * Returns a time snapshot in arbitrary time.
     * @return      A time snapshot.
     */
    public long snapshot() {
        return System.nanoTime() / 1000;
    }

    /**
     * Constructs and returns a lock.
     * @return      A `Lock`.
     */
    public Lock createLock() {
        return new ReentrantLock();
    }

}
