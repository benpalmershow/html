# General Product Requirements Document (PRD) & Development Skill

## Core Development Principles

### Simplicity First
- Write the minimum code that solves the problem
- Avoid abstractions nobody asked for
- Start with the simplest possible solution
- Only add complexity when absolutely necessary

### Surgical Changes
- Don't touch code unrelated to the request
- Every changed line must trace back to what was asked
- Make precise, targeted modifications
- Avoid "while I'm in here" improvements unless explicitly requested

### Goal-Driven Execution
- Turn vague instructions into verifiable success criteria before writing code
- Define what "done" looks like for each task
- Ensure all work directly contributes to meeting those success criteria
- Validate that the solution actually solves the stated problem

## Standard Operating Procedures

### Before Coding
1. **Understand the request completely** - Re-read instructions, ask clarifying questions if unsure
2. **Define success criteria** - What specific outcome indicates the task is complete?
3. **Locate relevant files** - Use search tools to find where changes need to be made
4. **Examine existing patterns** - Understand how similar functionality is implemented

### During Coding
1. **Make minimal changes** - Only modify what's necessary to achieve the goal
2. **Follow existing conventions** - Match code style, naming patterns, and architectural approaches
3. **Test as you go** - Verify changes work correctly before moving on
4. **Stay focused** - Avoid scope creep or unrelated improvements

### After Coding
1. **Verify against success criteria** - Confirm the solution meets all requirements
2. **Run validation** - Check for linting errors, test failures, or broken functionality
3. **Document if necessary** - Add comments only if requested or if code is non-obvious
4. **Clean up** - Remove any temporary code or debugging statements

## Specific Guidelines from Repository

### Journal Entries (from AGENTS.md)
- Must include timestamp in ISO-style format (e.g., "time": "08:30")
- Title must include an emoji prefix
- Content can be omitted if using file or link
- Link is optional URL reference for external sources
- Never delete existing entries from JSON data files unless explicitly instructed

### Financial Data Updates (from financial_fetch.md)
- Never enter market odds without verifying live from Kalshi/Polymarket URLs
- Always include lastUpdated (ISO timestamp) and source URLs in any JSON data change
- NFL format is always AWAY @ HOME
- Verify home/away designation and team abbreviations are correct

### Code Conventions (from AGENTS.md)
- File names: kebab-case
- JS variables/functions: camelCase
- ES6+ modules, async/await, try/catch around async operations
- CDN libs (marked, Chart.js, lucide) loaded globally - do not import as modules
- Relative imports within project
- Reusable UI changes belong in components/, not duplicated

### Anti-AI Writing Patterns (from AGENTS.md)
- Avoid em dashes in prose - use regular hyphen with spaces instead
- Avoid "It's not X, it's Y" inversion - restructure instead

### CSS/Theming (from AGENTS.md)
- Use CSS custom properties for all colors - never hardcode values that break dark mode
- Text must be black in light mode and white in dark mode; use theme-aware variables
- Always verify new UI works in both light and dark modes before committing

## Implementation Checklist

Before considering a task complete:
- [ ] Success criteria defined and met
- [ ] Changes are minimal and surgical
- [ ] Code follows existing conventions
- [ ] No unrelated files modified
- [ ] No em dashes in prose
- [ ] No "It's not X, it's Y" inversions
- [ ] Financial data includes proper verification and timestamps
- [ ] Journal entries follow required format
- [ ] CSS uses theme-aware variables
- [ ] Solution verified to work correctly

## When Unsure
- Ask clarifying questions before proceeding
- Don't guess or make assumptions
- Seek confirmation on ambiguous requirements
- Verify understanding before implementing