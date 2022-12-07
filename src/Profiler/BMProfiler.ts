/**
 * The profile is used to measure running code in order to identify performance bottlenecks.
 * It acts as an API which can be used to start a profiling session, or end it and generate
 * a profiling report file.
 */
@ConfigurationTables(class {
    reportSettings: Table<BMProfilerReportSettings>;
})
@ThingDefinition class BMProfiler extends GenericThing {
    /**
     * Starts a profiling session on the server.
     */
    beginProfiling(): void {
        BMProfilerRuntime.beginProfiling();
    }

    /**
     * Ends the current profiling session on the server and creates a profile
     * report file in the configured repository.
     * @returns     A link to download the generated report file.
     */
    finishProfiling(): HYPERLINK {
        const filename = BMProfilerRuntime.finishProfiling();

        const config = this.GetConfigurationTable({tableName: 'reportSettings'}) as INFOTABLE<BMProfilerReportSettings>;

        return `/Thingworx/FileRepositories/${config.repository}/${config.path}/${filename}`;
    }
}

interface Things {
    BMProfilerJavaBridge: {getBridge(): BMProfilerJavaBridge};
}