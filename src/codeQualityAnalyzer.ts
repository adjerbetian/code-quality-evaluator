import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { readdir as readdirAsync, stat as statAsync } from 'fs/promises';
import { join, relative } from 'path';

import { type Analysis, type FolderAnalysis, type FileAnalysis, type QualityVerdict, getMetrics } from './common.ts';

const CONFIG = {
    fileExtensions: ['.ts', '.js', '.tsx', '.jsx'] as const,
    ignorePatterns: ['node_modules'],
};

export class CodeQualityAnalyzer {
    private readonly rootPath: string;
    private readonly outputPath: string;

    constructor(rootPath: string, outputPath: string) {
        this.rootPath = rootPath;
        this.outputPath = outputPath;
    }

    async analyze(): Promise<FolderAnalysis> {
        this.logAnalysisStart();
        const result = await this.performDirectoryAnalysis();
        this.saveResults(result);
        this.displayResults(result);
        return result;
    }

    private async performDirectoryAnalysis(): Promise<FolderAnalysis> {
        return await this.analyzeDirectory(this.rootPath, this.rootPath);
    }

    private async analyzeDirectory(dirPath: string, dirName: string): Promise<FolderAnalysis> {
        return {
            type: 'folder',
            name: dirName,
            children: await this.processDirectoryContents(dirPath),
        };
    }

    private async processDirectoryContents(dirPath: string): Promise<Analysis[]> {
        const children: Analysis[] = [];

        try {
            const entries = await this.readDirectoryEntries(dirPath);

            for (const entry of entries) {
                const fullPath = join(dirPath, entry);
                const entryAnalysis = await this.processDirectoryEntry(fullPath, entry);
                if (entryAnalysis) children.push(entryAnalysis);
            }
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
        }

        return children;
    }

    private async processDirectoryEntry(fullPath: string, entry: string): Promise<Analysis | null> {
        const stats = await this.getFileStats(fullPath);

        if (stats.isDirectory()) return await this.analyzeDirectory(fullPath, entry);
        else if (stats.isFile() && this.shouldAnalyzeFile(fullPath, entry)) return this.analyzeFile(fullPath, entry);

        return null;
    }

    private analyzeFile(filePath: string, fileName: string): FileAnalysis {
        try {
            const analysis = this.performFileAnalysis(filePath);
            return this.createFileAnalysisResult(fileName, analysis);
        } catch (error) {
            return this.createErrorAnalysis(fileName, error);
        }
    }

    private performFileAnalysis(filePath: string): string {
        const prompt = this.buildAnalysisPrompt(filePath);
        const command = this.buildCursorCommand(prompt);

        console.log(`Analyzing ${filePath}...`);
        return execSync(command, {
            encoding: 'utf-8',
            timeout: 5 * 60 * 1000, // 5 minutes
        });
    }

    private parseRawAnalysis(analysis: string): QualityVerdict {
        const verdictMatch = analysis.match(/^\**Verdict\**: \**((?:\w| )+)\**$/m);
        return verdictMatch ? (verdictMatch[1] as QualityVerdict) : 'Critical';
    }

    private displayResults(result: Analysis): void {
        console.log('\n=== ANALYSIS SUMMARY ===');
        console.log(`Total files analyzed: ${this.calculateTotalFiles(result)}`);
        const { verdictCounts } = getMetrics(result).metrics;
        this.printVerdictBreakdown(verdictCounts);
    }

    private calculateTotalFiles(result: Analysis): number {
        if (result.type === 'file') return 1;
        return result.children.reduce((sum, child) => sum + this.calculateTotalFiles(child), 0);
    }

    private logAnalysisStart(): void {
        console.log(`Starting code quality analysis for: ${this.rootPath}`);
        console.log(`Output will be saved to: ${this.outputPath}`);
    }

    private saveResults(result: Analysis): void {
        writeFileSync(this.outputPath, JSON.stringify(result, null, 4));
        console.log(`Analysis complete! Results saved to ${this.outputPath}`);
    }

    private async readDirectoryEntries(dirPath: string): Promise<string[]> {
        return await readdirAsync(dirPath);
    }

    private async getFileStats(filePath: string) {
        return await statAsync(filePath);
    }

    private shouldAnalyzeFile(filePath: string, fileName: string): boolean {
        const relativePath = relative(this.rootPath, filePath);
        if (CONFIG.ignorePatterns.some((pattern) => relativePath.includes(pattern))) return false;

        const ext = fileName.substring(fileName.lastIndexOf('.'));
        return CONFIG.fileExtensions.includes(ext as any);
    }

    private buildAnalysisPrompt(filePath: string): string {
        return PROMPT.replace('$filePath', filePath);
    }

    private buildCursorCommand(prompt: string): string {
        return `/Applications/Cursor.app/Contents/Resources/app/bin/cursor agent -p --output-format text "${prompt.replace(
            /"/g,
            '\\"',
        )}"`;
    }

    private createFileAnalysisResult(fileName: string, analysis: string): FileAnalysis {
        const verdict = this.parseRawAnalysis(analysis);
        return {
            type: 'file',
            name: fileName,
            analysis: analysis.trim(),
            verdict,
        };
    }

    private createErrorAnalysis(fileName: string, error: unknown): FileAnalysis {
        console.error(`Error analyzing ${fileName}:`, error);
        return {
            type: 'file',
            name: fileName,
            analysis: `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
            verdict: 'Critical',
        };
    }

    private printVerdictBreakdown(verdictCounts: Record<string, number>): void {
        console.log('\nBreakdown by quality:');
        for (const [verdict, count] of Object.entries(verdictCounts)) console.log(`  ${verdict}: ${count}`);
    }
}

const PROMPT = `
# Code Quality Evaluation

Evaluate the overall code quality of the file \\\`$filePath\\\` using established software engineering principles, primarily from "Clean Code", "Clean Architecture", and "Domain-Driven Design".

## Evaluation Criteria

- Function design
  - Each function should do one thing.
  - Functions should be small
    - the best is less than 5 lines of code
    - above 20 lines is too long
  - Functions should avoid excessive arguments.
    - less than 3 arguments is best
    - destructured objects arguments count as separate arguments.
      For instance, one big \\\`options\\\` argument with 10 properties counts as 10 arguments.
- Test quality
  - Code should be covered by tests.
  - Tests should clearly communicate intent and act as living documentation.
- Architecture & design
  - Business logic should be separated from technical details.
  - Core functionalities should be understandable, even to a non-technical reader.

## Notes

- Do not reward clear naming. Consider it a baseline expectation.
- Since this is still in an experimental phase:
  - Ignore error handling and edge case testing.
  - Ignore hardcoded configurations.
- Only rate the current file, not the surrounding.
  - For instance, if the file is tested, but the tests are not readable, do not penalize this file's rating for this.

## Output Format

First provide a detailed evaluation based on the above principles.

Then, classify the code quality into one of these categories:
  - Poor: Significant rework needed to align with clean code principles.
  - Fair: Some principles applied, but major gaps remain.
  - Good: Code generally aligns with principles but has notable areas for improvement.
  - Very Good: Mostly clean and well-structured with only minor issues.
  - Excellent: Strong adherence to clean code and architecture principles.

Finally, give your final verdict in one line in the following format:

Verdict: <verdict>

for example:

Verdict: Poor
`;
