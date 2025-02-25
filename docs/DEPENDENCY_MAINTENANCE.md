# Dependency Maintenance

### Recommendations / Prerequisites

- Make sure you have set up and can run the app locally before starting this process, if not, check the `README` file.
- Create a backup of the `package.json` and `package-lock.json` files
- Check you are making use of the proper `node` and `npm` versions before starting the maintenance process.

### 1. Analyze Dependencies

a. Check for outdated packages:

```bash
npm outdated
```

b. Run security audit:

```bash
npm audit
```

### 2. Update Process

> Note: It is recommended to start wiht core dependencies first. Start with non-breaking updates (patch versions), then move to minor version updates, and finally, handle major version updates last and carefully.

Update all packages to their latest version according to package.json

```bash
npm update
```

Or if you want to update a spefici package at the time to check the app after each update you can use the following command

```bash
npm install <package-name>@latest
```

### 3. Verification Steps

a. Run security audit again to ensure no vulnerabilities have been introduced after the updates:

```bash
npm audit
```

> Note: Some dependencies after an audit might required a downgrade, which means that it won't be on the latest version possible but that's better than having vulnerabilities.

b. Clear npm cache:

```bash
npm cache clean --force
```

c. Remove node_modules and reinstall:

```bash
rm -rf node_modules
npm install
```

d. Manual Testing Checklist:

- [ ] Application starts without errors
- [ ] Main features are working
- [ ] No console errors in browser
- [ ] Build process completes successfully

### 4. Emergency Rollback Process

If issues occur after updating dependencies:

a. Restore backups:

```bash
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json
```

b. Reinstall original dependencies:

```bash
rm -rf node_modules
npm install
```

## Best Practices

a. Update dependencies in stages:

- Start with patch updates
- Then minor updates
- Finally, major updates

b. Regular Maintenance:

- Run `npm audit` weekly
- Review outdated packages monthly
- Keep documentation updated

c. Version Control:

- Create a separate branch for dependency updates
- Commit package.json and package-lock.json changes
- Test thoroughly before merging

## Future considerations

### Automated Dependency Checking

To automate dependency maintenance, security vulnerabilities and compatibility issues there are a few tools that can be integrated or configured to deal with this. The tools are:

- [Snyk](https://snyk.io/)
- [Dependabot](https://github.com/dependabot).
  - Check out [dependabot quickstart guide](https://docs.github.com/en/code-security/getting-started/dependabot-quickstart-guide) for more information.

## Handling Deprecated Dependencies

### Current Known Deprecated Dependencies

As of February 2024, the following deprecated packages are present as transitive dependencies through `@creit.tech/stellar-wallets-kit@1.5.0`:

1. `ripple-lib` (via @trezor/blockchain-link)

   ```
   @creit.tech/stellar-wallets-kit
   └─ @trezor/connect-plugin-stellar
      └─ @trezor/connect
         └─ @trezor/blockchain-link
            └─ ripple-lib
   ```

2. `lodash.isequal` (via @walletconnect/core)

   ```
   @creit.tech/stellar-wallets-kit
   └─ @walletconnect/sign-client
      └─ @walletconnect/core
         └─ lodash.isequal
   ```

3. `@motionone/vue` (via @walletconnect/modal-ui)
   ```
   @creit.tech/stellar-wallets-kit
   └─ @walletconnect/modal
      └─ @walletconnect/modal-ui
         └─ motion
            └─ @motionone/vue
   ```

### Handling Transitive Dependencies

1. **Monitor Impact**

   - Check if deprecation warnings affect functionality
   - Review security implications
   - Track updates to parent packages

2. **Resolution Options**

   - Wait for upstream packages to update
   - Consider alternative packages
   - Fork and maintain critical dependencies if necessary

3. **Documentation**
   - Track known deprecated dependencies
   - Document any workarounds or limitations
   - Update when resolved

### Checking Transitive Dependencies

To check which package is bringing in a specific dependency:

```bash
# List dependency tree for specific package
npm ls <package-name>

# Example
npm ls ripple-lib
```

### Best Practices for Dependencies

1. **Regular Audits**

   - Run `npm audit` for security issues
   - Check `npm outdated` for updates
   - Review deprecation warnings

2. **Version Locking**

   - Use exact versions for critical dependencies
   - Lock versions if deprecated dependencies cause issues
   - Document version constraints

3. **Update Strategy**
   - Monitor upstream repositories for updates
   - Test thoroughly when parent packages update
   - Plan migration paths for deprecated features
