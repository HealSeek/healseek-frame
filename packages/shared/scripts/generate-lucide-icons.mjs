import { createRequire } from 'node:module'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const output = resolve(root, 'packages/shared/src/icons/lucide.json')
const require = createRequire(import.meta.url)
const sourceExtensions = new Set(['.js', '.jsx', '.json', '.mjs', '.ts', '.tsx', '.vue'])
const ignoredDirectories = new Set(['.git', '.output', '.pnpm', 'coverage', 'dist', 'node_modules'])

function loadLucide() {
    try {
        return require('@lucide/vue')
    } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') throw error
        // Existing pnpm checkouts can have the package in the store before
        // the shared package's new devDependency is linked by install.
        const store = join(root, 'node_modules/.pnpm')
        const folder = readdirSync(store).find((name) => name.startsWith('@lucide+vue@'))
        if (!folder) throw error
        return require(join(store, folder, 'node_modules/@lucide/vue'))
    }
}

function collectNames(directory, names) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
            if (!ignoredDirectories.has(entry.name)) collectNames(path, names)
        } else if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
            const source = readFileSync(path, 'utf8')
            for (const match of source.matchAll(/\blucide:([a-z0-9]+(?:-[a-z0-9]+)*)\b/g)) {
                names.add(match[1])
            }
        }
    }
}

function escapeAttribute(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
}

function renderNode([tag, attributes]) {
    const attrs = Object.entries(attributes)
        .filter(([key]) => key !== 'key')
        .map(([key, value]) => {
            const htmlKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
            return ` ${htmlKey}="${escapeAttribute(value)}"`
        })
        .join('')
    return `<${tag}${attrs}/>`
}

function iconData(lucide, name) {
    if (name === 'blank') return { body: '', width: 24, height: 24 }
    if (name === 'github') {
        // This brand glyph is retained in the demo sprite but is no longer
        // exported by the current Lucide package.
        return {
            body: '<path fill="currentColor" fill-rule="evenodd" d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844" clip-rule="evenodd"/>',
            width: 19,
            height: 19,
        }
    }
    const exportName = name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
    const component = lucide[exportName]
    if (typeof component !== 'function') throw new Error(`Unknown Lucide icon: ${name}`)
    const nodes = component({}, { attrs: {}, slots: {} })?.props?.iconNode
    if (!Array.isArray(nodes)) throw new Error(`Missing icon nodes: ${name}`)
    const body = `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes.map(renderNode).join('')}</g>`
    return { body, width: 24, height: 24 }
}

const names = new Set()
for (const source of ['app-ui', 'apps', 'internal/create-app/template', 'packages']) {
    collectNames(join(root, source), names)
}

const lucide = loadLucide()
const icons = Object.fromEntries([...names].sort().map((name) => [name, iconData(lucide, name)]))
const collection = `${JSON.stringify({ prefix: 'lucide', icons }, null, 2)}\n`

if (process.argv.includes('--write')) {
    writeFileSync(output, collection)
    console.log(`Generated ${names.size} local Lucide icons.`)
} else if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== collection) {
        console.error('Local Lucide icon collection is stale. Run pnpm --filter @healseek/shared icons:generate.')
        process.exitCode = 1
    } else {
        console.log(`Verified ${names.size} local Lucide icons.`)
    }
} else {
    console.error('Use --write or --check.')
    process.exitCode = 1
}
