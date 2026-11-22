import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))
const previousScope = '@airovo/'
const manifest = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'))

// Match the package groups in pnpm-workspace.yaml, not node_modules. Apps
// remain business-owned and need not adopt the framework's package names.
function manifestsIn(group) {
    return readdirSync(join(root, group), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(group, entry.name, 'package.json'))
        .filter((file) => existsSync(join(root, file)))
}

const frameworkFiles = [
    'app-ui/package.json',
    ...['internal', 'packages', 'packages/core', 'packages/ui-kit'].flatMap(manifestsIn),
]
const frameworkPackages = new Map(frameworkFiles.map((file) => [manifest(file).name, file]))

test('framework and tooling packages consistently use @healseek', () => {
    assert.equal(manifest('package.json').name, 'healseek-frame')
    // Duplicate names would make workspace resolution ambiguous after rename.
    assert.equal(frameworkPackages.size, frameworkFiles.length)
    for (const [name, file] of frameworkPackages) {
        assert.ok(name.startsWith('@healseek/'), `${file}: ${name}`)
    }
    assert.deepEqual(manifest('internal/create-app/package.json').bin, {
        'create-healseek': './dist/index.js',
    })
})

test('renamed workspace dependencies resolve to framework packages', () => {
    // Also inspect the starter: it is copied by the CLI, not installed as a
    // workspace package, so a normal pnpm install cannot catch its old names.
    const files = [...frameworkFiles, ...manifestsIn('apps'), 'internal/create-app/template/package.json']
    for (const file of files) {
        const value = manifest(file)
        for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
            for (const [name, version] of Object.entries(value[field] ?? {})) {
                assert.ok(!name.startsWith(previousScope), `${file}: ${name}`)
                if (version.startsWith('workspace:') && name.startsWith('@healseek/')) {
                    assert.ok(frameworkPackages.has(name), `${file}: unresolved ${name}`)
                }
            }
        }
    }
})

function* maintainedFiles(directory) {
    // Generated output and caches contain old builds until rebuilt. They are
    // not sources of truth and must not be rewritten as part of a rename.
    const ignored = new Set(['node_modules', 'dist', '.output', '.turbo', '.nitro', '.cache', 'coverage'])
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (ignored.has(entry.name)) continue
        const file = join(directory, entry.name)
        if (entry.isDirectory()) yield* maintainedFiles(file)
        else if (/\.(?:[cm]?[jt]s|tsx|vue|json|css|md|html|ya?ml)$/.test(entry.name)) yield file
    }
}

test('maintained sources, tooling, docs and lockfile contain no old package imports', () => {
    const files = ['package.json', 'pnpm-lock.yaml', '.eslintrc.js', 'README.md', 'CLAUDE.md']
        .map((file) => join(root, file))
    for (const directory of ['packages', 'internal', 'app-ui', 'apps/playwright', 'apps/mock-api', 'scripts', 'docs']) {
        files.push(...maintainedFiles(join(root, directory)))
    }
    for (const file of files) {
        // This regression itself intentionally names the previous scope.
        if (file === fileURLToPath(import.meta.url)) continue
        assert.ok(!readFileSync(file, 'utf8').includes(previousScope), relative(root, file))
    }
})

test('production config writer and app readers use the same renamed global', () => {
    // The writer and readers must change together: otherwise production
    // silently falls back to /api even though development still works.
    const config = readFileSync(join(root, 'internal/vite-config/src/config.ts'), 'utf8')
    const globalName = config.match(/const APP_CONFIG_GLOBAL = '([^']+)'/)?.[1]
    assert.equal(globalName, '_HEALSEEK_APP_CONF_')
    for (const app of ['apps/playwright', 'internal/create-app/template']) {
        const reader = readFileSync(join(root, app, 'src/config/env.ts'), 'utf8')
        assert.ok(reader.includes(`window?.${globalName}`), app)
    }
})
