#!/usr/bin/env node
//@ts-check
import { spawn } from 'child_process';
import { rmSync, mkdirSync, readdirSync } from 'fs';
import AdmZip from 'adm-zip';

process.stdout.write(`\x1b[2m❯\x1b[0m Compiling java project`);

// Build the java file
await new Promise(r => {
    spawn(
        'javac', 
        ['./src/java/com/bogdanmihaiciuc/profiler/*.java', '--release', '11', '-cp', './lib/\\*', '-d', './build/class'], 
        {stdio: 'inherit', shell: true}
    ).on('close', r)
});

// Create a jarfile
mkdirSync('./build/lib');
mkdirSync('./build/lib/common');
await new Promise(r => {
    spawn(
        'jar',
        [
            'cMf', 
            '../lib/common/BMProfilerJavaBridge.jar', 
            './',
        ], 
        {stdio: 'inherit', shell: true, cwd: `${process.cwd()}/build/class`}
    ).on('close', r)
});

// Clear the class folder
rmSync('./build/class', { recursive: true, force: true });

process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Compiled java project \n`);

process.stdout.write(`\x1b[2m❯\x1b[0m Creating package`);

const zipPath = `${process.cwd()}/zip`;

// Get the name of the zip file to recreate
const name = readdirSync(zipPath)[0];

// Clear the zip directory contents
rmSync(`${zipPath}/${name}`);

// Recreate the zip with the java resources
const admArchive = new AdmZip();
admArchive.addLocalFolder('./build');

await new Promise((resolve, reject) => {
    admArchive.writeZip(`${zipPath}/${name}`, (error) => {
        if (error) return reject(error);

        resolve(0);
    });
});


process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Created package \x1b[2mzip/${name}\x1b[0m\n`);