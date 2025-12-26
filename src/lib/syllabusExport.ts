// Syllabus Export Utility - generates clean markdown from syllabus data

import { CuratedStepResources, CuratedResource } from '@/hooks/useCuratedResources';

interface Module {
  title: string;
  tag: string;
  source: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  description?: string;
  isCapstone?: boolean;
  estimatedHours?: number;
  priority?: 'core' | 'important' | 'nice-to-have';
  isHiddenForTime?: boolean;
  isHiddenForDepth?: boolean;
  isAIDiscovered?: boolean;
}

interface DiscoveredSource {
  institution: string;
  courseName: string;
  url: string;
  type: string;
  content?: string;
  moduleCount?: number;
}

interface DiscoveredAuthority {
  name: string;
  domain: string;
  authorityType: 'industry_standard' | 'academic' | 'practitioner' | 'standard_body';
  authorityReason: string;
  focusAreas: string[];
}

interface TopicPillar {
  name: string;
  searchTerms: string[];
  recommendedSources: string[];
  priority: 'core' | 'important' | 'nice-to-have';
}

export interface ResourceCache {
  [stepTitle: string]: CuratedStepResources;
}

export interface SyllabusExportData {
  discipline: string;
  modules: Module[];
  source: string;
  rawSources?: DiscoveredSource[];
  compositionType?: 'single' | 'composite_program' | 'vocational';
  topicPillars?: TopicPillar[];
  narrativeFlow?: string;
  synthesisRationale?: string;
  discoveredAuthorities?: DiscoveredAuthority[];
  isAdHoc?: boolean;
  isAIEnhanced?: boolean;
}

export function generateSyllabusMarkdown(
  syllabusData: SyllabusExportData,
  cachedResources?: ResourceCache
): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Header
  lines.push(`# ${syllabusData.discipline} Learning Path`);
  lines.push('');
  
  // Meta info
  const visibleModules = syllabusData.modules.filter(m => !m.isHiddenForTime && !m.isHiddenForDepth);
  const compositionLabel = syllabusData.compositionType === 'composite_program' 
    ? 'Composite Program' 
    : syllabusData.compositionType === 'vocational' 
      ? 'Vocational' 
      : 'Single Source';
  lines.push(`> Generated on ${date} | ${compositionLabel} | ${visibleModules.length} modules`);
  lines.push('');

  // Overview
  if (syllabusData.synthesisRationale) {
    lines.push('## Overview');
    lines.push('');
    lines.push(syllabusData.synthesisRationale);
    lines.push('');
  }

  // Curriculum Pillars
  if (syllabusData.topicPillars && syllabusData.topicPillars.length > 0) {
    lines.push('## Curriculum Pillars');
    lines.push('');
    
    const corePillars = syllabusData.topicPillars.filter(p => p.priority === 'core');
    const importantPillars = syllabusData.topicPillars.filter(p => p.priority === 'important');
    const nicePillars = syllabusData.topicPillars.filter(p => p.priority === 'nice-to-have');
    
    if (corePillars.length > 0) {
      lines.push(`- **Core:** ${corePillars.map(p => p.name).join(', ')}`);
    }
    if (importantPillars.length > 0) {
      lines.push(`- **Important:** ${importantPillars.map(p => p.name).join(', ')}`);
    }
    if (nicePillars.length > 0) {
      lines.push(`- **Nice to Have:** ${nicePillars.map(p => p.name).join(', ')}`);
    }
    lines.push('');
  }

  // Narrative Flow
  if (syllabusData.narrativeFlow) {
    lines.push('## Learning Narrative');
    lines.push('');
    lines.push(syllabusData.narrativeFlow);
    lines.push('');
  }

  // Course Modules
  lines.push('## Course Modules');
  lines.push('');

  visibleModules.forEach((module, index) => {
    const moduleNumber = index + 1;
    const capstoneLabel = module.isCapstone ? ' 🎓' : '';
    const aiLabel = module.isAIDiscovered ? ' ✨' : '';
    
    lines.push(`### ${moduleNumber}. ${module.title}${capstoneLabel}${aiLabel}`);
    lines.push('');
    
    // Module metadata
    const meta: string[] = [];
    if (module.tag) meta.push(`**Tag:** ${module.tag}`);
    if (module.source) meta.push(`**Source:** ${module.source}`);
    if (module.estimatedHours) meta.push(`**Est. Time:** ${module.estimatedHours}h`);
    if (module.priority) meta.push(`**Priority:** ${module.priority}`);
    
    if (meta.length > 0) {
      lines.push(meta.join(' | '));
      lines.push('');
    }

    if (module.description) {
      lines.push(module.description);
      lines.push('');
    }

    // Include resources if available
    const stepResources = cachedResources?.[module.title];
    if (stepResources) {
      lines.push('#### Resources');
      lines.push('');
      
      // Core Video
      if (stepResources.coreVideo) {
        lines.push('**📺 Core Video:**');
        lines.push(formatResourceLine(stepResources.coreVideo));
        lines.push('');
      }
      
      // Core Reading
      if (stepResources.coreReading) {
        lines.push('**📖 Core Reading:**');
        lines.push(formatResourceLine(stepResources.coreReading));
        lines.push('');
      }
      
      // Deep Dive Resources
      if (stepResources.deepDive && stepResources.deepDive.length > 0) {
        lines.push('**🔍 Deep Dive:**');
        stepResources.deepDive.forEach(r => {
          lines.push(formatResourceLine(r));
        });
        lines.push('');
      }
      
      // MOOCs
      if (stepResources.moocs && stepResources.moocs.length > 0) {
        lines.push('**🎓 Online Courses:**');
        stepResources.moocs.forEach((mooc: any) => {
          const provider = mooc.source || mooc.provider || '';
          lines.push(`- [${mooc.title}](${mooc.url})${provider ? ` - ${provider}` : ''}`);
        });
        lines.push('');
      }
      
      // Expansion Pack
      if (stepResources.expansionPack && stepResources.expansionPack.length > 0) {
        lines.push('**📚 Additional Resources:**');
        stepResources.expansionPack.forEach(r => {
          lines.push(formatResourceLine(r));
        });
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  });

  // Discovered Authorities
  if (syllabusData.discoveredAuthorities && syllabusData.discoveredAuthorities.length > 0) {
    lines.push('## Discovered Authorities');
    lines.push('');
    lines.push('| Name | Domain | Type | Why |');
    lines.push('|------|--------|------|-----|');
    
    syllabusData.discoveredAuthorities.forEach(auth => {
      const typeLabel = auth.authorityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      lines.push(`| ${auth.name} | ${auth.domain} | ${typeLabel} | ${auth.authorityReason} |`);
    });
    lines.push('');
  }

  // Source Syllabi
  if (syllabusData.rawSources && syllabusData.rawSources.length > 0) {
    lines.push('## Source Syllabi');
    lines.push('');
    
    syllabusData.rawSources.forEach(source => {
      lines.push(`- [${source.institution} - ${source.courseName}](${source.url})`);
    });
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Exported from Syllabus Generator on ${date}*`);

  return lines.join('\n');
}

function formatResourceLine(resource: CuratedResource): string {
  const authorPart = resource.author ? ` by ${resource.author}` : '';
  const durationPart = resource.duration ? ` (${resource.duration})` : '';
  const rationalePart = resource.rationale ? ` - ${resource.rationale}` : '';
  return `- [${resource.title}](${resource.url})${authorPart}${durationPart}${rationalePart}`;
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function generateFilename(discipline: string): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedDiscipline = discipline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${sanitizedDiscipline}-syllabus-${date}.md`;
}
