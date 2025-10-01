import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { readdir as readdirAsync, stat as statAsync } from 'fs/promises';
import path from 'path';

import { type Analysis, type FolderAnalysis, type FileAnalysis, type QualityVerdict, getMetrics } from './common.ts';
import { fileURLToPath } from 'url';

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
                const fullPath = path.join(dirPath, entry);
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
            return this.createFileAnalysisResult(filePath, fileName, analysis);
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
        const relativePath = path.relative(this.rootPath, filePath);
        if (CONFIG.ignorePatterns.some((pattern) => relativePath.includes(pattern))) return false;

        const ext = fileName.substring(fileName.lastIndexOf('.'));
        return CONFIG.fileExtensions.includes(ext as any);
    }

    private buildAnalysisPrompt(filePath: string): string {
        const PROMPT = readFileSync(
            path.join(path.dirname(fileURLToPath(import.meta.url)), 'evaluation-prompt.md'),
            'utf-8'
        );
        return PROMPT.replace('$filePath', filePath);
    }

    private buildCursorCommand(prompt: string): string {
        prompt = prompt.replace(/\"/g, '\\"');
        prompt = prompt.replace(/`/g, '\\`');
        return `/Applications/Cursor.app/Contents/Resources/app/bin/cursor agent -p --output-format text "${prompt}"`;
    }

    private createFileAnalysisResult(filePath: string, fileName: string, analysis: string): FileAnalysis {
        const verdict = this.parseRawAnalysis(analysis);
        return {
            type: 'file',
            name: fileName,
            analysis: analysis.trim(),
            verdict,
            code: readFileSync(filePath, 'utf-8'),
        };
    }

    private createErrorAnalysis(fileName: string, error: unknown): FileAnalysis {
        console.error(`Error analyzing ${fileName}:`, error);
        return {
            type: 'file',
            name: fileName,
            analysis: `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
            verdict: 'Critical',
            code: '',
        };
    }

    private printVerdictBreakdown(verdictCounts: Record<string, number>): void {
        console.log('\nBreakdown by quality:');
        for (const [verdict, count] of Object.entries(verdictCounts)) console.log(`  ${verdict}: ${count}`);
    }
}
