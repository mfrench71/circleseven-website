# Claude Code Instructions

## Testing Policy

**CRITICAL**: After implementing ANY new feature or fixing ANY bug, you MUST:

1. **Write tests** for the new functionality or bug fix
2. **Run tests** using `npm test` to ensure they pass
3. **Verify test coverage** for the affected code
4. **Do NOT commit** code without tests

### Test Requirements

- **New features**: Must have unit tests covering all code paths
- **Bug fixes**: Must include a test that would have caught the bug
- **API changes**: Must validate HTTP headers and request/response format
- **Refactoring**: Must maintain or improve existing test coverage

### Testing Checklist

Before committing any code change:

- [ ] Tests written for new functionality
- [ ] Tests run successfully (`npm test`)
- [ ] All existing tests still pass
- [ ] Test coverage maintained or improved
- [ ] GitHub API mocks include header validation when applicable

### Examples

**Adding a new Netlify function:**
```javascript
// 1. Write the function
// 2. Write tests in tests/unit/backend/
// 3. Validate headers with mockPutFile/mockDeleteFile
// 4. Run npm test
// 5. Only then commit
```

**Fixing a bug:**
```javascript
// 1. Write a test that reproduces the bug
// 2. Verify test fails
// 3. Fix the bug
// 4. Verify test passes
// 5. Commit both fix and test
```

**Adding new frontend module:**
```javascript
// 1. Write the module
// 2. Write tests in tests/unit/frontend/
// 3. Mock all external dependencies
// 4. Test all public functions
// 5. Run npm test
// 6. Commit
```

## GitHub API Usage

When using `githubRequest()` from `netlify/utils/github-api.cjs`:

- ✅ Content-Length header is automatically added for requests with bodies
- ✅ Content-Type should be explicitly set in options.headers
- ✅ All DELETE/PUT requests with bodies are automatically validated in tests

## Test Mock Guidelines

When writing tests that interact with GitHub API:

```javascript
// ✅ GOOD - Headers are validated
mockDeleteFile('_posts/test.md', { commit: { sha: 'abc' } });

// ❌ BAD - Skipping header validation
mockDeleteFile('_posts/test.md', { commit: { sha: 'abc' } }, { validateHeaders: false });
```

## Pre-Commit Reminders

Before you commit:
1. Have you written tests?
2. Do all tests pass?
3. Is test coverage adequate?
4. Are HTTP headers validated in mocks?

## Related Documentation

- `TESTING_IMPROVEMENTS.md` - Comprehensive testing strategy
- `tests/unit/utils/github-api.test.js` - Example of proper HTTP testing
- `tests/utils/github-mock.js` - GitHub API mocking utilities

---

**Remember**: Code without tests is considered incomplete. Always write and run tests before committing.
