#!/usr/bin/env node

/* eslint-disable no-mixed-operators */

/**
 * To run, use the following command:
 * npm run evaluate <folder-path> [output-file]
 */

import { CodeQualityAnalyzer } from './codeQualityAnalyzer.ts';
import { exportVisualization } from './common.ts';

void main();

async function main() {
    let [, , folderPath, outputFile] = process.argv;

    if (!folderPath) {
        console.log('Usage: npm run evaluate <folder-path> [output-file]');
        console.log('Example: npm run evaluate npm run evaluate ../joko/joko-ai-service/src/engine/handlers/tests/');
        process.exit(1);
    }

    if (!outputFile) {
        outputFile = `outputs/${formatPath(folderPath)}.json`;
    }

    try {
        const analyzer = new CodeQualityAnalyzer(folderPath, outputFile);
        const report = await analyzer.analyze();
        exportVisualization(report, outputFile.replace('.json', '.html'));
    } catch (error) {
        console.error('Analysis failed:', error);
        process.exit(1);
    }
}

/**
 * Format the path to be a valid filename.
 * Example: ../joko/joko-ai-service/src/engine/handlers/tests/ -> joko-ai-service.src.engine.handlers.tests
 */
function formatPath(path: string) {
    let parts = path.split('/');
    parts = parts.map((part) => part.replace(/^[. ]*/, ''));
    parts = parts.filter((part) => part !== '');
    const srcIndex = parts.indexOf('src');
    if (srcIndex >= 1) {
        parts = parts.slice(srcIndex - 1);
    }
    return parts.join('.');
}
