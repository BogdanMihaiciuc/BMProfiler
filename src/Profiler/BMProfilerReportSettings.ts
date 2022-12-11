/**
 * A data shape that describes the settings that can be configured for the profiler,
 * related to where report files should be saved.
 */
class BMProfilerReportSettings extends DataShapeBase {

    /**
     * The repository where report files should be saved.
     */
    repository: THINGNAME<'FileRepository'> = 'SystemRepository';

    /**
     * The path within the repository where profile reports should be saved.
     * This should not include a trailing slash
     */
    path: STRING = 'ProfileReports';

}