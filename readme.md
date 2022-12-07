# Intro

A thingworx extension that allows profiling blocks of code, creating reports that can be viewed using the Chrome performance inspector. It is primarily meant to be used with typescript projects created using [ThingworxVSCodeProject](https://github.com/BogdanMihaiciuc/ThingworxVSCodeProject) using the `--trace` flag.

# How to use

The first step is to install this extension. You can either download the latest release and install it directly or build it from this repo. If you are prompted to restart the Thingworx server after installing, do so.

The extension creates a `BMProfiler` thing that contains two services:
 - `beginProfiling` - should be executed to start a profiling session on the system.
 - `finishProfiling` - should be executed to finish the current profiling session and generate a report file. The service returns a URL to download the report file.

While a profile session is active, all trace events are recorded in memory until it is stopped. The easiest way to generate trace events is to build your thingworx typescript project with the `--trace` flag. This will automatically add trace events to all function and service invocations in your project.

It is also possible to use this without typescript projects. To do this, you can manually generate trace events from within your services:
```js
// Obtain the profiler instance for the current thread
const profiler = BMProfilerRuntime.localProfiler;

// Activate the profiler
profiler.retain();
try {

    // Generate a start event, passing in the name with which this block will appear in the report
    profiler.start('MyCodeBlock');

    // ... code to measure

    // End the measurement
    profiler.end();

}
finally {
    // Deactivate the profiler. Make sure to call this in a finally block
    // to ensure that it does not remain activated when an exception is thrown
    profiler.release();
}
```

The generated report is a json file that can be opened in the Chrome performance inspector. To do this, open the inspector, select the `Performance` tab and drop the report file into the inspector window.

# Development

## Pre-Requisites

The following software is required:

* [NodeJS](https://nodejs.org/en/): needs to be installed and added to the `PATH`. You should use the LTS version (v14+).
* [JDK](https://www.oracle.com/java/technologies/downloads/) needs to be installed and added to the `PATH`.

The following software is recommended:

* [Visual Studio Code](https://code.visualstudio.com/): An integrated developer enviroment with great javascript and typescript support. You can also use any IDE of your liking, it just that most of the testing was done using VSCode.

The java libraries are also required to be able to build the java extension. They should go in the `lib` folder:
* Thingworx Extension SDK - obtain this from your PTC support account
* `rhino` - obtain this from your local thingworx installation

## Build

To build the extension, run `npm run build` in the root of the project. This will generate an extension .zip file in the zip folder in the root of the project.

## Deployment

To deploy to the thingworx server, you can manually install the extension that is generated in the zip folder in the root of the project.

# Disclaimer

The BMProfiler extension is not an official Thingworx product. It is something developed to improve the life of Thingworx developers and it is not supported by PTC.

# License

[MIT License](license)
