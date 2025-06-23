#!/usr/bin/env python3
"""
Conversation-to-Spec Generator
Automatically converts Claude conversation logs into structured specification documents

Author: Adam (Navy Veteran)
Purpose: Systematize the proven conversation -> spec -> build workflow
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import argparse


class SpecGenerator:
    """Generates specification documents from conversation logs"""
    
    def __init__(self):
        self.templates = {
            'web_app': self._get_web_app_template(),
            'ai_system': self._get_ai_system_template(),
            'trading_system': self._get_trading_system_template(),
            'general': self._get_general_template()
        }
    
    def analyze_conversation(self, conversation_text: str) -> Dict[str, any]:
        """Analyze conversation to extract key information"""
        analysis = {
            'project_type': self._detect_project_type(conversation_text),
            'requirements': self._extract_requirements(conversation_text),
            'technical_stack': self._extract_tech_stack(conversation_text),
            'architecture': self._extract_architecture_decisions(conversation_text),
            'timeline': self._extract_timeline(conversation_text),
            'budget': self._extract_budget_info(conversation_text),
            'risks': self._extract_risks(conversation_text),
            'success_metrics': self._extract_success_metrics(conversation_text),
            'user_stories': self._extract_user_stories(conversation_text),
            'features': self._extract_features(conversation_text)
        }
        return analysis
    
    def _detect_project_type(self, text: str) -> str:
        """Detect the type of project based on keywords"""
        text_lower = text.lower()
        
        # Check for specific project indicators
        if any(keyword in text_lower for keyword in ['resume', 'ats', 'job', 'hiring']):
            return 'web_app'
        elif any(keyword in text_lower for keyword in ['trading', 'algorithm', 'market', 'stock']):
            return 'trading_system'
        elif any(keyword in text_lower for keyword in ['ai', 'machine learning', 'neural', 'gpt']):
            return 'ai_system'
        else:
            return 'general'
    
    def _extract_requirements(self, text: str) -> List[str]:
        """Extract functional and non-functional requirements"""
        requirements = []
        
        # Look for requirement patterns
        patterns = [
            r'(?:need|want|require|must have|should)\s+(?:to\s+)?([^.!?\n]+)',
            r'(?:goal|objective|purpose):\s*([^.\n]+)',
            r'(?:user|customer|client)\s+(?:wants|needs|requires)\s+([^.\n]+)'
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                req = match.group(1).strip()
                if len(req) > 10 and req not in requirements:  # Filter out very short matches
                    requirements.append(req)
        
        return requirements[:10]  # Limit to top 10
    
    def _extract_tech_stack(self, text: str) -> Dict[str, List[str]]:
        """Extract technology stack information"""
        tech_stack = {
            'frontend': [],
            'backend': [],
            'database': [],
            'apis': [],
            'tools': []
        }
        
        # Technology keywords mapping
        tech_keywords = {
            'frontend': ['react', 'vue', 'angular', 'typescript', 'javascript', 'html', 'css', 'tailwind'],
            'backend': ['node', 'python', 'django', 'flask', 'express', 'fastapi', 'n8n'],
            'database': ['postgresql', 'mysql', 'mongodb', 'supabase', 'firebase'],
            'apis': ['rest', 'graphql', 'claude', 'openai', 'stripe', 'webhook'],
            'tools': ['docker', 'kubernetes', 'git', 'vscode', 'claude code']
        }
        
        text_lower = text.lower()
        for category, keywords in tech_keywords.items():
            for keyword in keywords:
                if keyword in text_lower and keyword not in tech_stack[category]:
                    tech_stack[category].append(keyword)
        
        return tech_stack
    
    def _extract_architecture_decisions(self, text: str) -> List[str]:
        """Extract architectural decisions and patterns"""
        decisions = []
        
        # Look for architecture-related statements
        patterns = [
            r'(?:architecture|design|pattern|approach):\s*([^.\n]+)',
            r'(?:using|implementing|building with)\s+([^.\n]+)',
            r'(?:decided to|chosen to|going with)\s+([^.\n]+)'
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                decision = match.group(1).strip()
                if len(decision) > 10 and decision not in decisions:
                    decisions.append(decision)
        
        return decisions[:8]
    
    def _extract_timeline(self, text: str) -> Dict[str, str]:
        """Extract timeline and milestone information"""
        timeline = {}
        
        # Look for time-related mentions
        time_patterns = [
            r'(\d+)\s+(?:weeks?|days?|months?)',
            r'(?:deadline|due|launch|complete)\s+(?:by|in|within)\s+([^.\n]+)',
            r'(?:phase|milestone|sprint)\s+(\d+)[:\s]*([^.\n]+)'
        ]
        
        for pattern in time_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match.groups()) == 1:
                    timeline['duration'] = match.group(1)
                else:
                    timeline[f'milestone_{len(timeline)}'] = ' '.join(match.groups())
        
        return timeline
    
    def _extract_budget_info(self, text: str) -> Dict[str, str]:
        """Extract budget and cost information"""
        budget = {}
        
        # Look for cost mentions
        cost_patterns = [
            r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'(?:budget|cost|price|expense):\s*\$?([^.\n]+)',
            r'(?:cheap|expensive|affordable|costly)'
        ]
        
        costs = []
        for pattern in cost_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                costs.append(match.group(0))
        
        if costs:
            budget['mentioned_costs'] = costs[:5]
        
        return budget
    
    def _extract_risks(self, text: str) -> List[str]:
        """Extract risks and challenges"""
        risks = []
        
        risk_patterns = [
            r'(?:risk|problem|issue|challenge|concern):\s*([^.\n]+)',
            r'(?:might|could|may)\s+(?:fail|break|not work)\s+([^.\n]+)',
            r'(?:what if|concern about|worried about)\s+([^.\n]+)'
        ]
        
        for pattern in risk_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                risk = match.group(1).strip()
                if len(risk) > 10 and risk not in risks:
                    risks.append(risk)
        
        return risks[:6]
    
    def _extract_success_metrics(self, text: str) -> List[str]:
        """Extract success criteria and metrics"""
        metrics = []
        
        success_patterns = [
            r'(?:success|metric|measure|goal):\s*([^.\n]+)',
            r'(?:target|aim for|expecting)\s+(\d+[^.\n]*)',
            r'(?:when this works|if successful)\s+([^.\n]+)'
        ]
        
        for pattern in success_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                metric = match.group(1).strip()
                if len(metric) > 5 and metric not in metrics:
                    metrics.append(metric)
        
        return metrics[:5]
    
    def _extract_user_stories(self, text: str) -> List[str]:
        """Extract user stories and use cases"""
        stories = []
        
        story_patterns = [
            r'(?:user|customer|client)\s+(?:can|will|should)\s+([^.\n]+)',
            r'(?:as a|when a)\s+user\s+([^.\n]+)',
            r'(?:users want to|people need to)\s+([^.\n]+)'
        ]
        
        for pattern in story_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                story = match.group(1).strip()
                if len(story) > 10 and story not in stories:
                    stories.append(story)
        
        return stories[:8]
    
    def _extract_features(self, text: str) -> List[str]:
        """Extract feature list"""
        features = []
        
        feature_patterns = [
            r'(?:feature|functionality|capability):\s*([^.\n]+)',
            r'(?:will have|includes|supports)\s+([^.\n]+)',
            r'(?:build|create|implement)\s+([^.\n]+)'
        ]
        
        for pattern in feature_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                feature = match.group(1).strip()
                if len(feature) > 10 and feature not in features:
                    features.append(feature)
        
        return features[:10]
    
    def generate_spec(self, conversation_path: str, output_path: str = None) -> str:
        """Generate specification document from conversation"""
        # Read conversation
        with open(conversation_path, 'r', encoding='utf-8') as f:
            conversation_text = f.read()
        
        # Analyze conversation
        analysis = self.analyze_conversation(conversation_text)
        
        # Select appropriate template
        template = self.templates[analysis['project_type']]
        
        # Generate spec document
        spec_content = self._populate_template(template, analysis)
        
        # Save to file
        if output_path is None:
            output_path = str(Path(conversation_path).with_suffix('_spec.md'))
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(spec_content)
        
        return output_path
    
    def _populate_template(self, template: str, analysis: Dict) -> str:
        """Populate template with extracted information"""
        # Replace placeholders with actual data
        replacements = {
            '{{PROJECT_NAME}}': Path.cwd().name,
            '{{DATE}}': datetime.now().strftime('%Y-%m-%d'),
            '{{REQUIREMENTS}}': self._format_list(analysis['requirements']),
            '{{TECH_STACK}}': self._format_tech_stack(analysis['technical_stack']),
            '{{ARCHITECTURE}}': self._format_list(analysis['architecture']),
            '{{TIMELINE}}': self._format_timeline(analysis['timeline']),
            '{{BUDGET}}': self._format_budget(analysis['budget']),
            '{{RISKS}}': self._format_list(analysis['risks']),
            '{{SUCCESS_METRICS}}': self._format_list(analysis['success_metrics']),
            '{{USER_STORIES}}': self._format_list(analysis['user_stories']),
            '{{FEATURES}}': self._format_list(analysis['features'])
        }
        
        spec_content = template
        for placeholder, value in replacements.items():
            spec_content = spec_content.replace(placeholder, value)
        
        return spec_content
    
    def _format_list(self, items: List[str]) -> str:
        """Format list items as markdown"""
        if not items:
            return "- (None identified from conversation)"
        return '\n'.join(f"- {item}" for item in items)
    
    def _format_tech_stack(self, tech_stack: Dict) -> str:
        """Format technology stack as markdown"""
        result = []
        for category, technologies in tech_stack.items():
            if technologies:
                result.append(f"**{category.title()}:** {', '.join(technologies)}")
        return '\n'.join(result) if result else "- (No specific technologies mentioned)"
    
    def _format_timeline(self, timeline: Dict) -> str:
        """Format timeline information"""
        if not timeline:
            return "- (No timeline specified)"
        return '\n'.join(f"- {key}: {value}" for key, value in timeline.items())
    
    def _format_budget(self, budget: Dict) -> str:
        """Format budget information"""
        if not budget:
            return "- (No budget information mentioned)"
        return '\n'.join(f"- {key}: {value}" for key, value in budget.items())
    
    def _get_web_app_template(self) -> str:
        """Template for web application projects"""
        return """# {{PROJECT_NAME}} - Project Specification

**Generated:** {{DATE}}
**Type:** Web Application

## Project Overview

This specification was automatically generated from conversation analysis.

## Requirements

{{REQUIREMENTS}}

## Technical Architecture

### Technology Stack
{{TECH_STACK}}

### Architecture Decisions
{{ARCHITECTURE}}

## Features

{{FEATURES}}

## User Stories

{{USER_STORIES}}

## Timeline

{{TIMELINE}}

## Budget Considerations

{{BUDGET}}

## Risks and Mitigation

{{RISKS}}

## Success Metrics

{{SUCCESS_METRICS}}

## Implementation Notes

- This specification was generated from conversation logs
- Review and refine before implementation
- Update as requirements evolve

---
*Generated by Claude Code Dev Stack - Navy Veteran's Arsenal*
"""
    
    def _get_ai_system_template(self) -> str:
        """Template for AI system projects"""
        return """# {{PROJECT_NAME}} - AI System Specification

**Generated:** {{DATE}}
**Type:** AI/ML System

## System Overview

This specification was automatically generated from conversation analysis.

## Functional Requirements

{{REQUIREMENTS}}

## Technical Architecture

### Technology Stack
{{TECH_STACK}}

### AI/ML Components
{{ARCHITECTURE}}

## Capabilities

{{FEATURES}}

## Use Cases

{{USER_STORIES}}

## Development Timeline

{{TIMELINE}}

## Resource Requirements

{{BUDGET}}

## Technical Risks

{{RISKS}}

## Performance Metrics

{{SUCCESS_METRICS}}

## Implementation Strategy

- Iterative development approach
- Continuous testing and validation
- Performance monitoring and optimization

---
*Generated by Claude Code Dev Stack - AI for AI Development*
"""
    
    def _get_trading_system_template(self) -> str:
        """Template for trading system projects"""
        return """# {{PROJECT_NAME}} - Trading System Specification

**Generated:** {{DATE}}
**Type:** Trading/Financial System

## System Overview

This specification was automatically generated from conversation analysis.

## Trading Requirements

{{REQUIREMENTS}}

## System Architecture

### Technology Stack
{{TECH_STACK}}

### Trading Components
{{ARCHITECTURE}}

## Trading Features

{{FEATURES}}

## User Scenarios

{{USER_STORIES}}

## Development Timeline

{{TIMELINE}}

## Financial Considerations

{{BUDGET}}

## Risk Management

{{RISKS}}

## Performance Targets

{{SUCCESS_METRICS}}

## Compliance & Security

- Financial data protection
- Regulatory compliance requirements
- Risk management protocols
- Audit trail maintenance

---
*Generated by Claude Code Dev Stack - Building the Future*
"""
    
    def _get_general_template(self) -> str:
        """General template for other project types"""
        return """# {{PROJECT_NAME}} - Project Specification

**Generated:** {{DATE}}
**Type:** General Project

## Project Overview

This specification was automatically generated from conversation analysis.

## Requirements

{{REQUIREMENTS}}

## Technical Details

### Technology Stack
{{TECH_STACK}}

### Architecture
{{ARCHITECTURE}}

## Features

{{FEATURES}}

## User Stories

{{USER_STORIES}}

## Timeline

{{TIMELINE}}

## Budget

{{BUDGET}}

## Risks

{{RISKS}}

## Success Criteria

{{SUCCESS_METRICS}}

## Next Steps

- Review and refine this specification
- Break down into implementation tasks
- Begin development iterations

---
*Generated by Claude Code Dev Stack*
"""


def main():
    """Command line interface for spec generator"""
    parser = argparse.ArgumentParser(description='Generate specs from conversation logs')
    parser.add_argument('conversation_file', help='Path to conversation log file')
    parser.add_argument('-o', '--output', help='Output specification file path')
    parser.add_argument('--type', choices=['web_app', 'ai_system', 'trading_system', 'general'],
                       help='Force specific project type')
    
    args = parser.parse_args()
    
    if not Path(args.conversation_file).exists():
        print(f"❌ Conversation file not found: {args.conversation_file}")
        return 1
    
    generator = SpecGenerator()
    
    try:
        output_path = generator.generate_spec(args.conversation_file, args.output)
        print(f"✅ Specification generated: {output_path}")
        return 0
    except Exception as e:
        print(f"❌ Error generating specification: {e}")
        return 1


if __name__ == "__main__":
    exit(main())