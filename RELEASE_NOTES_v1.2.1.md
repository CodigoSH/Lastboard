# Release: v1.2.1




### 📝 Other Changes
- feat: Security hardening, performance optimization (DB pool, telemetry), and comprehensive test suite.
- test: add comprehensive backend and frontend tests
- chore(cleanup): remove unused websocket upgrader var
- perf(core): limit db conns to 25 and pause telemetry when idle
- fix(server): configure explicit HTTP timeouts to prevent memory leaks from idle connections
- chore(docs): document translation workflow and update sync script with 'Remember Me' keys
- feat(i18n): add 'Remember Me' translations for all 20 supported languages
- feat(auth): implement 'remember me' functionality with 30-day session option
- feat(core): extend session duration to 30 days and improve release changelog accuracy
- fix(server): prevent aggressive html caching with cache-control headers
- fix(ci): remove redundant cp command incompatible with new build script
- fix(build): unify frontend build process across all environments
- chore(ci): disable caching entirely for maximum robustness
- chore(ci): re-enable go cache and cleanup debug comments
- fix(cli): implement --version flag to prevent CI hang
- fix(ci): disable go cache and add 5m timeout to debug hang
- fix(ci): disable manual bun cache to prevent timeouts, keep setup-go cache
- Remove Gallery section from README
- ci: enable caching for go and bun to speed up workflows
- fix(ci): pin gosec version to v2.21.0 for valid sarif output
- fix(ci): grant security-events write permission for sarif upload
- ci: add concurrency to auto-cancel redundant runs
- chore(ci): upgrade artifact actions to v4/v3
- fix(ci): add missing dependencies to benchmark and security jobs
- docs: add gallery, config, and data sections to README
- Update section headers in README.md
- Refactor section headings in CONTRIBUTING.md
- docs: improve project documentation and DX (makefile, air)
- chore: remove .agent from gitignore to track docs
- docs: update release workflow to use unified script
- refactor(scripts): unify release scripts into single release.sh
- feat(docker): professionalize distribution (multi-stage build, ghcr workflow, fixed port)
- fix(docker): use dynamic port in healthcheck
- feat(docker): enhance security with non-root user and healthcheck
- chore: simplify .gitignore to only include .agent/ per user request
- chore: update .gitignore with AI tools exclusion and sync pending changes
- Update README.md
- Update README.md
- Update README.md
- Update README.md
- Limpieza de cache
- Refactor update status UI, improve UX stability, and sync translations

---
**Full Changelog**: [v1.2.0...v1.2.1](https://github.com/CodigoSH/Lastboard/compare/v1.2.0...v1.2.1)
