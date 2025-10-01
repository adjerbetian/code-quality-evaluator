#!/usr/bin/env node

/**
 * Code Quality Visualization Tool
 *
 * To run, use the following command:
 * npx ts-node visualize-code-quality.ts <report-file> [output-file]
 * Example: npx ts-node visualize-code-quality.ts code-quality-report.json code-quality-visualization.html
 */

import { readFileSync } from 'fs';

import { type Analysis, exportVisualization } from './common.ts';

main();

function main() {
    let [, , reportPath] = process.argv;

    reportPath = reportPath || 'code-quality/outputs/code-quality-report.json';
    const outputPath = reportPath.replace('.json', '.html');

    try {
        const report: Analysis = JSON.parse(readFileSync(reportPath, 'utf-8'));
        exportVisualization(report, outputPath);
    } catch (error) {
        console.error('Visualization failed:', error);
        process.exit(1);
    }
}
