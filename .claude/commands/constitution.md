---
name: constitution
description: Generate constitutional framework with 9 immutable architectural principles for specification-driven development. Creates .specify/constitution.md establishing project guardrails for code quality, testing standards, and architectural constraints before any implementation begins.
---

# /constitution Command

Generate a **Constitutional Framework** for your project using GitHub spec-kit methodology.

## Quick Start

```bash
/constitution                           # Generate default constitution
/constitution --project="My SaaS App"   # With custom project context
/constitution --output=docs/            # Custom output location
```

## What It Does

Creates `.specify/constitution.md` with **9 immutable architectural principles** that govern all development decisions:

1. **Library-First Principle** - Features as standalone libraries
2. **CLI Interface Mandate** - All functionality via CLI
3. **Test-First Imperative** - Tests before implementation
4. **Integration-First Testing** - Real environments over mocks
5. **Simplicity Mandate** - Max 3 entities initially
6. **Anti-Abstraction Principle** - Use frameworks directly
7. **Documentation-As-Code** - Specs precede code
8. **Semantic Branching** - Branches from spec numbering
9. **Complexity Tracking** - Justified violations only

## Usage

### Basic Generation

```bash
/constitution
```

**Output**: `.specify/constitution.md` in current directory

**Content**:
```markdown
# Project Constitutional Framework

**Version**: 1.0.0
**Established**: 2025-11-04
**Status**: Active

This constitution establishes immutable architectural principles...

## Article I: Library-First Principle
Every feature begins as a standalone, reusable library...
```

### Custom Project Context

```bash
/constitution --project="E-commerce Platform"
```

Adapts principles to e-commerce context:
- Article I mentions "payment processing as `@ecom/payments` library"
- Article V applies to products, orders, customers entities
- Performance standards mention sub-200ms p99 latency

### Specify Output Location

```bash
/constitution --output=project/docs/
```

Creates `project/docs/constitution.md` instead of `.specify/`

### Add Custom Principles

```bash
/constitution --custom="Performance-First,Security-First"
```

Adds Article X and XI with your custom principles:
- Article X: Performance-First Principle
- Article XI: Security-First Principle

### Full Customization

```bash
/constitution \
  --project="Healthcare Platform" \
  --entities="Patient,Provider,Appointment" \
  --performance="100ms p95" \
  --custom="HIPAA-Compliance,Audit-Trail"
```

Generates constitution with:
- Healthcare-specific examples
- 3 core entities (Patient, Provider, Appointment)
- Performance requirement: 100ms p95
- Articles X-XI for HIPAA compliance and audit trails

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--project` | Project name/context | `--project="SaaS Platform"` |
| `--entities` | Core entities (comma-separated, max 3) | `--entities="User,Post,Comment"` |
| `--performance` | Performance requirement | `--performance="200ms p99"` |
| `--security` | Security standards | `--security="OAuth2,JWT"` |
| `--custom` | Additional principles (comma-separated) | `--custom="Mobile-First,API-First"` |
| `--output` | Output directory | `--output=docs/` |
| `--template` | Use specific template | `--template=saas` or `--template=enterprise` |
| `--help` | Show this help | `/constitution --help` |

## Constitution Structure

### Generated File Structure

```markdown
# [Project Name] Constitutional Framework

**Version**: 1.0.0
**Established**: [Date]
**Status**: Active

## Preamble

This constitution establishes immutable architectural principles...

## Core Values

- **Clarity over cleverness**
- **Intent over implementation**
- **Quality over speed**

## The Nine Principles

### Article I: Library-First Principle
[Full principle with project-specific examples]

### Article II: CLI Interface Mandate
[Full principle with command examples]

... [Articles III-IX]

## Enforcement

- Constitutional compliance validated at plan stage
- Violations tracked in complexity table
- Justifications required for all exceptions

## Amendment Process

Constitutional changes require:
1. Team consensus (if team > 1)
2. Documented rationale
3. Version increment
4. Historical preservation

## Quality Standards

### Code Quality
- Linting: [Standards]
- Formatting: [Tool and config]
- Complexity: [Max cyclomatic complexity]

### Testing Requirements
- Unit test coverage: ≥80%
- Integration tests: All critical paths
- E2E tests: User journeys

### Performance Expectations
- API response time: [Requirement]
- Database query time: [Requirement]
- Frontend render: [Requirement]

### Security Standards
- Authentication: [Method]
- Authorization: [Pattern]
- Data encryption: [Requirements]

## Compliance Tracking

| Article | Compliance | Violations | Status |
|---------|------------|------------|--------|
| I: Library-First | 100% | 0 | ✅ |
| II: CLI Interface | 95% | 2 | ⚠️ |
...

## Version History

### v1.0.0 (2025-11-04)
- Initial constitution established
- 9 core principles defined
```

## Templates

### SaaS Template

```bash
/constitution --template=saas
```

Optimized for:
- Multi-tenancy
- API-first architecture
- Scalability requirements
- Subscription billing patterns

### Enterprise Template

```bash
/constitution --template=enterprise
```

Optimized for:
- Security compliance
- Audit trails
- Integration with legacy systems
- Gradual migration patterns

### Microservices Template

```bash
/constitution --template=microservices
```

Optimized for:
- Service boundaries
- API contracts
- Event-driven architecture
- Distributed tracing

### Mobile Template

```bash
/constitution --template=mobile
```

Optimized for:
- Offline-first
- Performance on constrained devices
- Platform-specific guidelines (iOS/Android)
- App store compliance

## Examples

### Example 1: New SaaS Project

```bash
/constitution \
  --project="Task Management SaaS" \
  --entities="Task,Project,User" \
  --performance="150ms p95" \
  --template=saas
```

**Generated**: `.specify/constitution.md`

**Highlights**:
- Article I: "Task management as `@taskly/core` library"
- Article V: "Initial focus on Task, Project, User (3 entities)"
- Performance: "All API endpoints respond within 150ms at p95"
- Multi-tenancy guidelines included

### Example 2: Healthcare Platform

```bash
/constitution \
  --project="Telehealth Platform" \
  --entities="Patient,Appointment,Provider" \
  --security="HIPAA,SOC2" \
  --custom="Privacy-First,Audit-Everything"
```

**Generated**: `.specify/constitution.md`

**Highlights**:
- Article X: Privacy-First Principle (HIPAA compliance)
- Article XI: Audit-Everything Principle (full audit trails)
- Security standards emphasize encryption at rest/transit
- Patient data isolation requirements

### Example 3: Internal Tool

```bash
/constitution --project="Internal Analytics Dashboard"
```

**Generated**: Simple constitution for internal tool

**Highlights**:
- Relaxed performance requirements (not customer-facing)
- Focus on maintainability over scalability
- Simplified security (internal network only)
- Faster iteration cycles

### Example 4: Open Source Library

```bash
/constitution \
  --project="Data Validation Library" \
  --custom="Backwards-Compatibility,Zero-Dependencies"
```

**Generated**: Constitution for OSS library

**Highlights**:
- Article X: Backwards-Compatibility Principle
- Article XI: Zero-Dependencies Principle
- Emphasis on library-first (already a library)
- Public API stability requirements

## Integration with Spec-Kit Workflow

### Step 1: Establish Constitution (This Command)

```bash
cd my-project
/constitution --project="My Project"
```

**Output**: `.specify/constitution.md`

### Step 2: Create Specification

```bash
/speckit.specify "user authentication"
```

**Process**:
- Reads `.specify/constitution.md`
- Validates spec against constitutional principles
- Flags potential violations early

### Step 3: Generate Plan

```bash
/speckit.plan specs/001-auth/spec.md
```

**Process**:
- Validates constitutional compliance
- Tracks violations in complexity table
- Requires justification for exceptions

### Step 4: Implementation

Constitution enforced throughout via:
- Pre-commit hooks checking test-first
- CI/CD validating library structure
- Code review checklist from constitution

## Validation

After generation, constitution is validated for:

- ✅ All 9 core principles present
- ✅ Project-specific examples included
- ✅ Quality standards defined
- ✅ Enforcement mechanisms specified
- ✅ Amendment process documented
- ✅ Markdown properly formatted

## Amendment

To update constitution:

```bash
# Manual edit
vim .specify/constitution.md

# Or regenerate with new parameters
/constitution \
  --project="My Project" \
  --custom="New-Principle" \
  --amend
```

**Amendment creates**:
- New version (e.g., v1.1.0)
- Preserves old version in history section
- Documents change rationale

## Best Practices

### When to Establish Constitution

✅ **DO establish at project start**:
- New greenfield projects
- Major rewrites/refactors
- Adopting spec-driven methodology

⚠️ **MAYBE establish mid-project**:
- Codifying existing patterns
- Unifying team practices
- Addressing technical debt

❌ **DON'T establish**:
- Prototypes/experiments (too early)
- Projects near completion (too late)
- Single-file scripts (overkill)

### Customization Guidelines

**DO customize**:
- Project-specific entities
- Performance requirements
- Domain-specific principles (HIPAA, PCI, etc.)
- Team size and structure

**DON'T customize**:
- Core 9 principles (immutable)
- Fundamental quality standards
- Test-first imperative
- Basic software engineering practices

### Enforcement Strategies

**Lightweight (Small Teams)**:
- Manual code review against constitution
- Checklist during PR reviews
- Periodic constitution review sessions

**Medium (Growing Teams)**:
- Pre-commit hooks for basic checks
- CI/CD pipeline validations
- Automated complexity tracking

**Heavy (Large Teams)**:
- Custom linting rules from constitution
- Automated compliance dashboards
- Architecture decision records (ADRs)

## Troubleshooting

### Issue: "Constitution file already exists"

```bash
/constitution
# Error: .specify/constitution.md already exists
```

**Solutions**:
```bash
# Force overwrite
/constitution --force

# Amend existing
/constitution --amend

# Different output
/constitution --output=docs/constitution-v2.md
```

### Issue: "Too many custom principles"

```bash
/constitution --custom="P1,P2,P3,P4,P5"
# Warning: 5 custom principles added (max recommended: 3)
```

**Rationale**: Keep constitution focused. More principles = harder enforcement.

**Solution**: Consolidate or move to "Quality Standards" section.

### Issue: "Entities exceed simplicity mandate"

```bash
/constitution --entities="User,Post,Comment,Like,Share,Tag"
# Warning: 6 entities violates Article V (max 3 initially)
```

**Solution**:
```bash
# Start with core 3
/constitution --entities="User,Post,Comment"

# Document others as "future entities" in spec
```

## Output Locations

Default: `.specify/constitution.md`

Alternative locations:
- `docs/CONSTITUTION.md`
- `specs/constitution.md`
- `PROJECT-CONSTITUTION.md`
- `.github/CONSTITUTION.md` (if using GitHub)

## Related Commands

- `/speckit.specify` - Create specification (uses constitution)
- `/speckit.plan` - Generate plan (validates against constitution)
- `/speckit.analyze` - Check constitutional compliance
- `/actualize` - Sync constitutions across projects

## Exit Codes

- `0` - Success
- `1` - Invalid flags
- `2` - File write error
- `3` - Validation error
- `4` - Template not found

## Version History

- v1.0.0 (2025-11-04): Initial command with 9 core principles
- Future: Custom principle templates, team collaboration features

---

**Next Steps After Generation**:

1. Review `.specify/constitution.md`
2. Customize quality standards section
3. Share with team for consensus
4. Begin spec-kit workflow with `/speckit.specify`

**Philosophy**: "The constitution isn't bureaucracy—it's freedom through constraints. Clear principles enable confident, parallel development."
