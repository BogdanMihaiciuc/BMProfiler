/**
 * An interface that describes an object that is tracked by the profiler.
 */
interface BMProfilerObject {
    /**
     * A string that uniquely identifies this object.
     */
    id: string;

    /**
     * A name with which this object will be displayed in the generated report.
     */
    name: string;

    /**
     * The timestamp at which this object was created.
     */
    created?: number;

    /**
     * A developer defined category for the object.
     */
    category: string;

    /**
     * The timestamp at which this object was destroyed.
     */
    destroyed?: number;

    /**
     * The ID of the thread on which this event occurred.
     */
    thread: string;

    /**
     * An array that contains the snapshots which describe the various
     * states the object has had throughout its lifecycle.
     */
    snapshots: BMProfilerObjectSnapshot[];
}

/**
 * An interface that describes the state an object has had at a moment in time.
 */
interface BMProfilerObjectSnapshot {
    /**
     * The object's state at the specified time.
     */
    state: unknown;

    /**
     * The timestamp when this state became active.
     */
    timestamp: number;
}