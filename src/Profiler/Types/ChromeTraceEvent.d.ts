/**
 * The interface for an object describing a chrome trace event that can be viewed
 * using the chrome trace viewer.
 */
interface ChromeTraceEvent {

    /**
     * The name of this event, usually the function name.
     */
    name: string;

    /**
     * The category of this event, representing where the traced code is implemented.
     */
    cat: string;

    /**
     * The kind of event:
     * * `'B'` represents a begin event.
     * * `'E'` represents an end event.
     * * `'N'` represents a new event.
     * * `'D'` represents a delete event.
     * * `'O'` represents an update event.
     */
    ph: 'B' | 'E' | 'N' | 'D' | 'O';

    /**
     * The time, in microseconds, when this event occurred.
     */
    ts: number;

    /**
     * The process ID for the process in which the event occurred. Always 0 for the thingworx profiler.
     */
    pid: 0;

    /**
     * The thread ID of the thread in which the event occurred.
     */
    tid: number | string;

    /**
     * For object events, this represents the ID of the object.
     */
    id?: string;

    /**
     * Arbitrary key-value data to be associated with this event.
     */
    args?: Record<string, any>;

    /**
     * The color with which to represent this event.
     */
    cname: string;
}