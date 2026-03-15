# Contributing to VSCode Android

Thank you for your interest in contributing to VSCode Android! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Guidelines](#pull-request-guidelines)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Documentation](#documentation)

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Welcome newcomers and help them learn
- Keep discussions on-topic and professional

---

## Getting Started

### 1. Fork the Repository

```bash
# Click "Fork" on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/vscode-android.git
cd vscode-android
```

### 2. Set Up Development Environment

Follow the [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

### 3. Create a Branch

```bash
# Always branch from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

---

## Development Workflow

### 1. Make Changes

```bash
# Edit files
# ...

# Stage changes
git add src/components/YourComponent.tsx

# Commit with clear message
git commit -m "feat: add new feature description"
```

### 2. Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint
```

### 3. Build and Test

```bash
# Build for Android
npm run tauri:android:build

# Or test on device
npm run tauri:android:dev
```

---

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Changes tested on Android device/emulator
- [ ] No console errors or warnings

### PR Title Format

```
type(scope): brief description

Examples:
feat(editor): add multi-cursor support
fix(sync): resolve race condition in queue processor
docs(readme): update setup instructions
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manually tested on device

## Screenshots
(if UI changes)

## Related Issues
Closes #123
```

---

## Coding Standards

### TypeScript/React

```typescript
// Use TypeScript, avoid 'any'
interface Props {
  name: string;
  count?: number;
}

// Functional components with typed props
export function MyComponent({ name, count = 0 }: Props) {
  return <div>{name}: {count}</div>;
}

// Use hooks properly
const [state, setState] = useState<Type>(initialValue);

// Cleanup effects
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe();
}, []);
```

### Rust

```rust
// Use Result types, avoid unwrap()
pub fn process_file(path: &str) -> Result<String, Error> {
    let content = std::fs::read_to_string(path)?;
    Ok(content)
}

// Document public functions
/// Process a file and return its content
/// 
/// # Arguments
/// * `path` - Path to the file
/// 
/// # Returns
/// * `Ok(String)` - File content
/// * `Err(Error)` - If file cannot be read
pub fn process_file(path: &str) -> Result<String, Error> {
    // Implementation
}

// Use descriptive variable names
let user_authentication_token = get_token();
```

### CSS/Tailwind

```tsx
// Use Tailwind classes
<div className="flex items-center gap-2 p-4 bg-vscode-bg">
  Content
</div>

// Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)}>
  Content
</div>
```

---

## Testing

### Unit Tests

```typescript
// src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent name="Test" />);
    expect(screen.getByText('Test: 0')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<MyComponent name="Test" />);
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(screen.getByText('Test: 1')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('should work as expected', async ({ page }) => {
  await page.goto('/');
  
  // Wait for app to load
  await page.waitForTimeout(2000);
  
  // Interact with UI
  await page.click('[data-testid="button"]');
  
  // Assert result
  await expect(page.locator('text=Success')).toBeVisible();
});
```

### Test Coverage Goals

| Component Type | Coverage Target |
|---------------|-----------------|
| Utility functions | 95%+ |
| Custom hooks | 90%+ |
| UI components | 80%+ |
| E2E critical paths | 100% |

---

## Documentation

### Code Comments

```typescript
// Good: Explains WHY
// Use debounced sync to avoid excessive API calls
// while maintaining responsive UX
const debouncedSync = debounce(sync, 300);

// Bad: Explains WHAT (obvious from code)
// Set timeout to 300ms
const timeout = 300;
```

### API Documentation

```typescript
/**
 * Sync a file to the connected Codespace
 * 
 * @param path - File path relative to workspace root
 * @param content - File content to sync
 * @returns Promise resolving when sync completes
 * 
 * @example
 * ```typescript
 * await syncFile('src/index.ts', 'console.log("hello")');
 * ```
 */
export async function syncFile(path: string, content: string): Promise<void> {
  // Implementation
}
```

### README Updates

When adding features, update:
- Feature list in README.md
- Setup instructions if requirements change
- Architecture diagrams if structure changes
- API reference if commands change

---

## Review Process

1. **Submit PR** with complete description
2. **Automated checks** run (CI/CD)
3. **Maintainer review** within 48 hours
4. **Address feedback** if requested
5. **Approval and merge**

### Review Response Times

- Bug fixes: 24-48 hours
- Features: 3-5 days
- Documentation: 1-3 days

---

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Checklist

- [ ] Update version in package.json
- [ ] Update version in tauri.conf.json
- [ ] Update CHANGELOG.md
- [ ] Run all tests
- [ ] Build release APK/AAB
- [ ] Create GitHub release
- [ ] Publish to Play Store (if applicable)

---

## Areas Needing Contribution

### High Priority

1. **Extension System** - VS Code compatible extensions
2. **Git UI** - Visual git operations
3. **Debug Adapter** - Remote debugging support
4. **Accessibility** - Screen reader support

### Good First Issues

Look for issues labeled:
- `good first issue`
- `help wanted`
- `beginner-friendly`

---

## Questions?

- **General questions**: GitHub Discussions
- **Bug reports**: GitHub Issues
- **Security issues**: Email security@vscode-android.dev

---

## Thank You!

Your contributions make VSCode Android better for everyone. We appreciate your time and effort!

## Code Review Checklist

For reviewers:

- [ ] Code follows style guidelines
- [ ] Tests are included
- [ ] Documentation is updated

