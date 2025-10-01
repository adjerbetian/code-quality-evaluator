/* eslint-disable @typescript-eslint/naming-convention, no-mixed-operators */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export type Analysis = FolderAnalysis | FileAnalysis;
export type FolderAnalysis = {
    type: 'folder';
    name: string;
    children: Analysis[];
};
export type FileAnalysis = {
    type: 'file';
    name: string;
    analysis: string;
    verdict: QualityVerdict;
};

export type AnalysisWithMetrics = FolderAnalysisWithMetrics | FileAnalysisWithMetrics;
export type FolderAnalysisWithMetrics = Omit<FolderAnalysis, 'children'> & {
    children: AnalysisWithMetrics[];
    metrics: QualityMetrics;
};
export type FileAnalysisWithMetrics = FileAnalysis & {
    metrics: QualityMetrics;
};

export const VERDICTS = ['Critical', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] as const;

export type QualityVerdict = (typeof VERDICTS)[number];

export const QualityVerdict = {
    toScore(verdict: QualityVerdict): number {
        return VERDICTS.indexOf(verdict);
    },
    toVerdict(score: number): QualityVerdict {
        if (score >= 4.5) return 'Excellent';
        if (score >= 3.5) return 'Very Good';
        if (score >= 2.5) return 'Good';
        if (score >= 1.5) return 'Fair';
        if (score >= 0.5) return 'Poor';
        return 'Critical';
    },
};

export interface QualityMetrics {
    averageScore: number;
    fileCount: number;
    verdictCounts: Record<QualityVerdict, number>;
}

export function getMetrics(analysis: FolderAnalysis): FolderAnalysisWithMetrics;
export function getMetrics(analysis: FileAnalysis): FileAnalysisWithMetrics;
export function getMetrics(analysis: Analysis): AnalysisWithMetrics;
export function getMetrics(analysis: Analysis): AnalysisWithMetrics {
    const metrics: QualityMetrics = {
        averageScore: 0,
        fileCount: 0,
        verdictCounts: Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])) as Record<QualityVerdict, number>,
    };

    if (analysis.type === 'file') {
        metrics.verdictCounts[analysis.verdict]++;
        metrics.averageScore = QualityVerdict.toScore(analysis.verdict);
        metrics.fileCount = 1;
        return {
            ...analysis,
            metrics,
        };
    }

    const children = analysis.children.map(getMetrics);
    for (const child of children)
        for (const verdict of VERDICTS) metrics.verdictCounts[verdict] += child.metrics.verdictCounts[verdict];

    metrics.fileCount = Object.values(metrics.verdictCounts).reduce((sum, count) => sum + count, 0);
    metrics.averageScore =
        Object.entries(metrics.verdictCounts).reduce(
            (sum, [verdict, count]) => sum + count * QualityVerdict.toScore(verdict as QualityVerdict),
            0
        ) / metrics.fileCount;
    return {
        ...analysis,
        children,
        metrics,
    };
}

export function exportVisualization(report: Analysis, outputPath: string) {
    const html = generateVisualization(report);
    writeFileSync(outputPath, html);
    execSync(`open -a "Google Chrome" "${outputPath}"`);
}
function generateVisualization(report: Analysis): string {
    const reportWithMetrics = getMetrics(report);
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const htmlTemplate = readFileSync(path.join(__dirname, 'visualize-code-quality-template.html'), 'utf-8');
    return htmlTemplate.replace('$REPORT', JSON.stringify(reportWithMetrics));
}
