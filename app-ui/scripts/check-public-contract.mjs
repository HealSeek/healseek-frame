import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

async function source(path) {
    return readFile(new URL(path, root), 'utf8')
}

async function assertMissing(path) {
    await assert.rejects(
        stat(new URL(path, root)),
        (error) => error?.code === 'ENOENT',
        `legacy app-ui component must be removed after migration: ${path}`,
    )
}

const entry = await source('src/index.ts')
assert.match(entry, /ServiceHealthCard/)
assert.doesNotMatch(entry, /LegacyTable/)

const componentsEntry = await source('../packages/core/components/src/index.ts')
for (const name of [
    'empty-state',
    'result-page',
    'stat-card',
    'status-badge',
    'user-card',
    'data-table',
]) {
    assert.match(componentsEntry, new RegExp(`['"]?\\./${name}['"]?`), `components must export ${name}`)
}

const component = await source('src/components/service-health-card/ServiceHealthCard.vue')
assert.match(component, /from ['"]@healseek\/components['"]/)
assert.doesNotMatch(component, /packages\/core\//)
assert.doesNotMatch(component, /@healseek\/layouts\/src\//)
assert.match(component, /StatusBadge/)

for (const path of [
    '../packages/core/components/src/user-card/UserCard.vue',
    '../packages/core/components/src/stat-card/StatCard.vue',
    '../packages/core/components/src/status-badge/StatusBadge.vue',
    '../packages/core/components/src/empty-state/EmptyState.vue',
    '../packages/core/components/src/result-page/ResultPage.vue',
    '../packages/core/components/src/data-table/DataTable.vue',
]) {
    await readFile(new URL(path, root), 'utf8')
}

// The old app-ui paths are intentionally absent: keeping same-name wrappers
// would make the optional extension layer look like a framework override.
for (const path of [
    'src/components/user-card/UserCard.vue',
    'src/components/stat-card/StatCard.vue',
    'src/components/status-badge/StatusBadge.vue',
    'src/components/empty-state/EmptyState.vue',
    'src/components/result-page/ResultPage.vue',
    'src/components/table',
]) {
    await assertMissing(path)
}

console.log('app-ui public contract check passed (business extension + migration boundary).')
