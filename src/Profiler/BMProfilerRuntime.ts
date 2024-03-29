'use BMProfiler';

interface Resources {
    BMProfilerJavaBridgeHelper: {InitStandardObjects()}
}

declare const Packages: any;

// Returns a utility java bridge that grants access to a series of java objects
const _x = Resources.BMProfilerJavaBridgeHelper.InitStandardObjects();
const BMProfilerJavaBridge: BMProfilerJavaBridge = new Packages.com.bogdanmihaiciuc.profiler.BMProfilerJavaBridge();

/**
 * A class that implements the profiler runtime that trace services use in order to measure
 * their execution time. A profiler runtime cannot be created directly, instead an existing instance
 * can be requested for a thread by using the static `localProfiler` property. Each thread may have
 * at most one profiler running at a time.
 * 
 * When a profiler is obtained, before any measurement can take place, it must be "activated" by invoking
 * its `retain` method. To deactivate it, and generate the profile report, invoke the `release` method.
 * If `retain` is invoked multiple times, `release` must be invoked once for each time the profiler was retained.
 * When the profiler is released, any measurement started since the last time the profiler was retained is finished.
 * 
 * To measure a section of code, invoke the `begin` method, passing in a name with which that measurement should appear
 * in the report. Finish the measurement by invoking the `finish` method. Multiuple measurements may be nested and will
 * appear in the report as subsections of the initial measurement.
 */
class BMProfilerRuntime {

    /**
     * A thread local used to associate a profiler runtime instance with a thread.
     */
    private static _threadLocalProfiler: ThreadLocal<BMProfilerRuntime> = BMProfilerJavaBridge.createThreadLocal();

    /**
     * A lock used to synchronize access to shared resources.
     */
    private static _lock = BMProfilerJavaBridge.createLock();

    /**
     * An array containing the profilers for all threads.
     */
    private static _profilers: BMProfilerRuntime[] = [];

    /**
     * Adds the specified profiler to the list of profilers.
     * @param profiler      The profiler to add.
     */
    private static _addProfiler(profiler: BMProfilerRuntime) {
        this._lock.lock();

        this._profilers.push(profiler);

        this._lock.unlock();
    }

    /**
     * An array containing the root measurements across all active profilers.
     */
    private static _measurements: BMProfilerMeasurement[] = [];

    /**
     * Adds the specified measurement to the list of measurements that will be exported
     * in a profile report.
     * @param measurement       The measurement to add.
     */
    private static _addMeasurement(measurement: BMProfilerMeasurement): void {
        this._lock.lock();

        this._measurements.push(measurement);

        this._lock.unlock();
    }

    /**
     * Controls whether profiling is running for this server.
     */
    private static _profiling = false;

    /**
     * Begins a profiling session. If a session is already started, an error will be thrown.
     */
    static beginProfiling(): void {
        try {
            this._lock.lock();

            if (this._profiling) {
                throw new Error('Unable to start a profiling session because one is already in progress.');
            }

            // Clear all existing profilers and measurements
            this._profilers.forEach(p => p._cleared = true);
            this._profilers = [];
            this._measurements = [];

            this._profiling = true;

        }
        finally {
            this._lock.unlock();
        }

    }

    /**
     * Ends the current profiling session and generates a profile report file.
     * If there is no current profiling session running, an error will be thrown.
     * @returns         The name of the file that was generated.
     */
    static finishProfiling(): string {
        try {
            this._lock.lock();

            if (!this._profiling) {
                throw new Error('Unable to finish the profiling session because there isn\'t one started.');
            }

            // Create the report events
            const traceEvents: ChromeTraceEvent[] = [];
            this._measurements.forEach(measurement => BMProfilerRuntime.createEventsForMeasurement(measurement, traceEvents));

            // Merge the recorded object lists
            const objects: Record<string, BMProfilerObject> = {};
            this._profilers.forEach(p => {
                // Stop all further measurements on these profilers
                p._cleared = true;

                for (let key in p._objects) {
                    var object = p._objects[key];

                    var combinedObject = objects[key] ??= {
                        name: object.name,
                        id: object.id,
                        category: object.category,
                        snapshots: object.snapshots,
                        thread: object.thread
                    }

                    // If this entry has the creation timestamp, it also has the category and thread
                    if (object.created) {
                        combinedObject.thread = object.thread;
                        combinedObject.created = object.created;
                        combinedObject.category = object.category;
                    }

                    if (object.destroyed) {
                        combinedObject.destroyed = object.destroyed;
                    }

                    // Merge the state updates
                    combinedObject.snapshots = combinedObject.snapshots.concat(object.snapshots);
                }
            });

            Object.keys(objects).forEach(key => BMProfilerRuntime.createEventsForObject(objects[key], traceEvents));

            traceEvents.sort((a, b) => a.ts - b.ts);

            const report = {
                traceEvents,
                otherData: {
                    version: 'BMProfiler v1.1'
                }
            };

            // Clear all existing profilers and measurements
            this._profilers = [];
            this._measurements = [];

            this._profiling = false;

            // Write the file to the repository
            const config = Things.BMProfiler.GetConfigurationTable({tableName: 'reportSettings'}) as BMProfilerReportSettings;
            const name = `trace-${Date.now()}.json`;

            const repository = Things[config.repository];
            if (repository) {
                repository.SaveJSON({path: `${config.path}/${name}`, content: report});
            }

            return name;

        }
        finally {
            this._lock.unlock();
        }
    }

    private static readonly eventColorMap = {
        unknown: 'generic_work',
        standard: 'cq_build_attempt_passed',
        thingworx: 'rail_response',
        import: 'cq_build_attempt_running',
        project: 'detailed_memory_dump'
    };

    /**
     * Creates the start and end trace events for the specified measurement and all its child measurements.
     * @param measurement       The measurement for which to create trace events.
     * @param events            An array of events to which the newly created events will be added.
     * @returns                 If this measurement delays its parent, this returns the end time of this event, otherwise `NaN`.
     */
    static createEventsForMeasurement(measurement: BMProfilerMeasurement, events: ChromeTraceEvent[]): number {
        // Create the begin event
        const beginEvent: ChromeTraceEvent = {
            cat: measurement.kind || 'service',
            name: measurement.name,
            ph: 'B',
            ts: measurement.start,
            pid: 0,
            tid: measurement.thread,
            args: {
                file: measurement.file,
                lineNumber: measurement.lineNumber
            },
            cname: this.eventColorMap[measurement.kind || 'unknown'],
        };
        events.push(beginEvent);

        // Create events for all sub-measurements
        const endTimes = measurement.measurements.map(measurement => BMProfilerRuntime.createEventsForMeasurement(measurement, events)).filter(t => !Number.isNaN(t));
        const delayedStartTime = endTimes.length ? endTimes.reduce((a, v) => a > v ? a : v) : NaN;

        // If any child event delays the parent event, update the start time accordingly
        if (!isNaN(delayedStartTime)) {
            // 10 ns are added to the delayed start time because chrome doesn't handle the events being out of order.
            // As the resolution of the trace is in milliseconds, the inaccuracy shouldn't be too great
            beginEvent.ts = delayedStartTime + 0.001;

            // TODO: In the future, duration events ("X") might be a more appropriate way to handle this scenario
        }

        // Create the end event
        events.push({
            cat: measurement.kind || 'service',
            name: measurement.name,
            ph: 'E',
            ts: measurement.end || measurement.start,
            pid: 0,
            tid: measurement.thread,
            args: {
                file: measurement.file,
                lineNumber: measurement.lineNumber,
            },
            cname: this.eventColorMap[measurement.kind || 'unknown'],
        });

        if (measurement.delaysParent) {
            return measurement.end || Number.NaN;
        }

        return Number.NaN;
    }

    /**
     * Creates the new, delete and update trace events for the specified object and its snapshots.
     * @param object        The object for which to generate trace events.
     * @param events        An array of events to which the newly created events will be added.
     */
    static createEventsForObject(object: BMProfilerObject, events: ChromeTraceEvent[]): void {
        const minTimestamp = events[0]?.ts || 0;

        // Create the new event
        events.push({
            cat: object.category,
            cname: 'unknown',
            name: object.name,
            id: object.name,
            ph: 'N',
            pid: 0,
            tid: object.thread,
            ts: object.created || minTimestamp
        });

        // Create an event for each snapshot
        object.snapshots.forEach(snapshot => {
            try {
                const sanitizedSnapshot = JSON.parse(JSON.stringify(snapshot.state));
    
                events.push({
                    cat: object.category,
                    cname: 'unknown',
                    name: object.name,
                    id: object.name,
                    ph: 'O',
                    pid: 0,
                    tid: object.thread,
                    ts: snapshot.timestamp,
                    args: {
                        snapshot: sanitizedSnapshot
                    }
                });
            }
            catch (e) {
                // Exclude non-serializable snapshots
            }
        });

        // Create the destroyed event
        events.push({
            cat: object.category,
            cname: 'unknown',
            name: object.name,
            id: object.name,
            ph: 'D',
            pid: 0,
            tid: object.thread,
            ts: object.destroyed || BMProfilerJavaBridge.snapshot()
        });
    }

    /**
     * Represents the instance of the profiler that is associated with the current thread.
     * If a profiler wasn't yet created for this thread, accessing this property will create one.
     */
    static get localProfiler(): BMProfilerRuntime {
        let profiler = this._threadLocalProfiler.get();

        // If there is no local profiler or it is cleared, create a new one
        if (!profiler || profiler._cleared) {
            // Create an appropriate profiler based on whether profiling is running or not
            if (this._profiling) {
                profiler = Object.create(BMProfilerRuntime.prototype).init() as BMProfilerRuntime;
            }
            else {
                profiler = Object.create(BMInactiveProfilerRuntime.prototype) as BMProfilerRuntime;
            }
            this._threadLocalProfiler.set(profiler);

            BMProfilerRuntime._addProfiler(profiler);
        }

        return profiler;
    }

    protected constructor() {
        throw new Error('A profiler runtime should not be created directly.');
    }

    /**
     * The number of the thread on which this profiler is running.
     */
    private _threadNumber: number;

    private _objects: Record<string, BMProfilerObject> = {};

    /**
     * Initializes this profiler runtime.
     */
    init(): BMProfilerRuntime {
        this._threadNumber = BMProfilerJavaBridge.threadNumber();
        this._retainCount = 0;
        this._objects = {};
        return this;
    }

    /**
     * When set to `true`, this profiler will not be reused.
     */
    private _cleared = false;

    /**
     * Keeps track of how many times this profiler runtime was retained.
     */
    private _retainCount = 0;

    /**
     * The currently active measurement block, if there is one.
     */
    private _currentMeasurementBlock?: never;

    /**
     * The current in-progress measurement, if there is one.
     */
    private _currentMeasurement?: BMProfilerMeasurement;

    /**
     * Retains this profiler runtime and begins a measurement block.
     * This method must be invoked on the threaad that is associated with
     * this profiler.
     * @returns             This profiler.
     */
    retain(): BMProfilerRuntime {
        this._retainCount += 1;

        return this;
    }

    /**
     * Releases this profiler runtime and ends the any measurements in the current
     * measurement block.
     */
    release(): void {
        // End all measurements on the current block
        let measurement = this._currentMeasurement;
        const block = this._retainCount;
        
        this._retainCount -= 1;

        while (measurement) {
            if (measurement.measurementBlock < block) break;

            // Close all active measurements within the block
            measurement.end = BMProfilerJavaBridge.snapshot();

            measurement = measurement.parentMeasurement;
        }

        this._currentMeasurement = measurement;

        // If the parent measurement was also started implicitly, finish it implicitly
        // if (measurement && measurement.implicit) {
        //     measurement.implicit--;
        // }
    }

    /**
     * Starts a new measurement and sets it as the active one for the current block.
     * @param name          The name with which this measurement will be represented in the profiling report.
     * @param file          The file in which this the measured code is found.
     * @param lineNumber    The line number in the file at which the measured code is found.
     * @param kind          The kind of event.
     * @param delaysParent  Whether this measurement causes the parent measurement to be delayed until this measurement ends.
     */
    begin(name: string, file?: string, lineNumber?: number, kind?: string, delaysParent?: boolean): void {
        const parentMeasurement = this._currentMeasurement;

        // Create a new measurement
        const measurement: BMProfilerMeasurement = {
            name,
            file,
            lineNumber,
            measurementBlock: this._retainCount,
            parentMeasurement,
            start: BMProfilerJavaBridge.snapshot(),
            measurements: [],
            thread: this._threadNumber,
            implicit: 0,
            kind,
            delaysParent
        }

        // Add it to the parent measurement and mark it as the active one
        parentMeasurement?.measurements.push(measurement);
        this._currentMeasurement = measurement;

        // If this is a root measurement, add it to the global measurements
        if (!parentMeasurement) {
            BMProfilerRuntime._addMeasurement(measurement);
        }
    }

    /**
     * Starts a new measurement and sets it as the active one for the current block, if no measurement
     * is currently active, otherwise continues to use the current measurement.
     * 
     * This method is reserved for use by trace builds created with thing transformer and should not be used
     * in developer-defined trace blocks.
     * @param name          The name with which this measurement will be represented in the profiling report.
     * @param file          The file in which this the measured code is found.
     * @param lineNumber    The line number in the file at which the measured code is found.
     * @param kind          The kind of event.
     */
    beginImplicit(name: string, file?: string, lineNumber?: number, kind?: string): void {
        if (this._currentMeasurement) {
            this._currentMeasurement.implicit += 1;
        }
        else {
            return this.begin(name, file, lineNumber, kind);
        }
    }

    /**
     * Starts a new synthetic measurement and sets it as the active one for the current block.
     * 
     * Reserved for internal use.
     * @param name          The name with which this measurement will be represented in the profiling report.
     * @param kind          Defaults to `"unknown"`. The kind of event.
     * @param thread        Defaults to the current thread. The thread on which this measurement will appear.
     */
    protected _beginSynthetic(name: string, kind?: string, thread?: string): void {
        const parentMeasurement = this._currentMeasurement;

        // Create a new measurement
        const measurement: BMProfilerMeasurement = {
            name,
            file: undefined,
            lineNumber: undefined,
            measurementBlock: this._retainCount,
            parentMeasurement,
            start: BMProfilerJavaBridge.snapshot(),
            measurements: [],
            thread: thread || this._threadNumber,
            implicit: 0,
            kind: kind || 'unknown',
            delaysParent: false
        }

        // Add it to the parent measurement and mark it as the active one
        parentMeasurement?.measurements.push(measurement);
        this._currentMeasurement = measurement;

        // If this is a root measurement, add it to the global measurements
        if (!parentMeasurement) {
            BMProfilerRuntime._addMeasurement(measurement);
        }
    }

    /**
     * Closes the current measurement.
     */
    finish(): void {
        const measurement = this._currentMeasurement;

        if (measurement) {
            measurement.end = BMProfilerJavaBridge.snapshot();
    
            this._currentMeasurement = measurement.parentMeasurement;
        }
    
    }

    /**
     * Continues the current measurement if it was started implicitly.
     * 
     * This method is reserved for use by trace builds created with thing transformer and should not be used
     * in developer-defined trace blocks.
     */
    finishImplicit(): void {
        if (this._currentMeasurement?.implicit) {
            this._currentMeasurement.implicit -= 1;
        }
    }

    /**
     * Registers an object creation event. This object's state can then be tracked using
     * the `updateObject` method.
     * @param name      The name of the object that will be tracked.
     * @param category  An optional category that will be used to color-code this event.
     * @param thread    An optional virtual thread in which to track this object. If not specified,
     *                  it will be tracked in the current thread.
     */
    createObject(name: string, category?: string, thread?: string): void {
        this._objects[name] = {
            name,
            id: name,
            category: category ?? 'object',
            snapshots: [],
            thread: thread ?? this._threadNumber.toFixed(),
            created: BMProfilerJavaBridge.snapshot()
        }
    }

    /**
     * Registers an object destruction event. For objects that haven't yet been destroyed when the
     * profiling session has ended, an event of this kind will be automatically generated at the end of the session.
     * 
     * This method may be called from a different thread than the thread where this object was created.
     * @param name      The name of the object being destroyed.
     */
    destroyObject(name: string): void {
        this._objects[name] ??= {
            name,
            id: name,
            category: 'object',
            snapshots: [],
            thread: this._threadNumber.toFixed(),
        }

        this._objects[name].destroyed = BMProfilerJavaBridge.snapshot();
    }

    /**
     * Registers a state change event for the specified object.
     * 
     * This method may be called from a different thread than the thread where this object was created.
     * @param name      The name of the object whose state was updated.
     * @param state     The object's new state. This object should be serializable.
     */
    updateObject(name: string, state: unknown) {
        this._objects[name] ??= {
            name,
            id: name,
            category: 'object',
            snapshots: [],
            thread: this._threadNumber.toFixed(),
        }

        this._objects[name].snapshots.push({state: state, timestamp: BMProfilerJavaBridge.snapshot()})
    }

    /**
     * Closes all in-progress measurements and measurement blocks.
     */
    stop(): void {
        while (this._retainCount) {
            this.release();
        }
    }

}

/**
 * A subclass of the profiler runtime that is creatd when requesting a profiler while profiling is not running.
 * The inactive profiler takes no action whenever any of its methods are invoked.
 */
class BMInactiveProfilerRuntime extends BMProfilerRuntime {
    override retain() { return this; }
    override release() {}
    override begin() {}
    override beginImplicit() {}
    override finish() {}
    override finishImplicit() {}
    override init() { return this; }
    override stop() {}
    override createObject() {}
    override destroyObject() {}
    override updateObject() {}
    protected override _beginSynthetic() {}
}