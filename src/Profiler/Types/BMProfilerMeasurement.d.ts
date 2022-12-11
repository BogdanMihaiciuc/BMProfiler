/**
 * An interface that describes a profiler measurement for a block of code.
 */
interface BMProfilerMeasurement {

    /**
     * The measurement block in which this measurement was taken.
     */
    measurementBlock: number;

    /**
     * The parent measurement from which this measurement was started.
     */
    parentMeasurement?: BMProfilerMeasurement;

    /**
     * The name with which this measurement will be represented in the profile report.
     */
    name: string;

    /**
     * If specified, this represents the path or name of the file in which the measured code block
     * is encountered.
     */
    file?: string;

    /**
     * If specified, this represents the line within the file where the measured code block is found.
     */
    lineNumber?: number;

    /**
     * The time when this measurement started, in microseconds.
     */
    start: number;

    /**
     * The time when this measurement finished, in microseconds. `undefined` for measurements that are in progress.
     */
    end?: number;

    /**
     * An array containing the child measurements started while this measurement was in progress.
     */
    measurements: BMProfilerMeasurement[];

    /**
     * The number of the thread on which the measurement took place.
     */
    thread: number;

    /**
     * Used to keep track of whether this measurement has also been started implicitly.
     */
    implicit: number;

    /**
     * The kind of event, which specifies where it originated.s
     */
    kind?: string;

    /**
     * When set to `true`, this measurement will delay its parent measurement, causing it to start when it ends.
     */
    delaysParent?: boolean;

}