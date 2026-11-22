/**
 * parseRules — 把 schema 的 `rules` 字段（zod schema 或字符串 DSL）
 * 统一转换为可用的 zod schema。给 VeeField 的 `:rules` 用。
 *
 * 支持的字符串 token（多个用 `,` 分隔，按序叠加）：
 *   - `required`     非空（min:1）
 *   - `email`        邮箱
 *   - `phone`        中国大陆手机号（1[3-9]xxxxxxxxx）
 *   - `min:N`        至少 N 个字符
 *   - `max:N`        最多 N 个字符
 *
 * 直接传入 ZodTypeAny 时原样返回。
 *
 * @example
 *   parseRules('required')              → z.string().min(1, '必填')
 *   parseRules('phone')                → z.string().regex(/^1[3-9]\d{9}$/)
 *   parseRules('required,email')       → chain
 *   parseRules('required,min:6,max:20') → chain
 *   parseRules(someZodSchema)          → someZodSchema
 */
import { z, ZodString, type ZodTypeAny } from 'zod'
import type { FormFieldSchema } from './types'
import { normalizeHexColor } from '@healseek/components'
import { isArrayValueFieldComponent, isColorPickerFieldComponent } from './form-defaults'

const RANGE_COMPONENTS = new Set(['DateRangePicker', 'daterange', 'DateTimeRangePicker', 'datetimerange'])

export function parseRules(
    rules: ZodTypeAny | string | undefined,
    component?: FormFieldSchema['component'],
): ZodTypeAny {
    if (isColorPickerFieldComponent(component)
        && (rules === undefined || rules === '' || rules === 'required')) {
        const color = z.string({ required_error: '必填' })
        const value = rules === 'required' ? color.min(1, '必填') : color
        const hex = value.refine(value => value === '' || Boolean(normalizeHexColor(value)), '颜色格式错误')
        return rules === 'required' ? hex : hex.optional()
    }
    if (isArrayValueFieldComponent(component)
        && (rules === undefined || rules === '' || rules === 'required')) {
        const values = z.array(z.string().trim().min(1), { required_error: '必填' })
        return rules === 'required' ? values.min(1, '必填') : values
    }
    // A range is one tuple value, not text or a pair of repeated form rows.
    // Preserve explicit Zod rules while making the ordinary optional/required
    // schema configurations accept the component's native Date model.
    if (typeof component === 'string' && RANGE_COMPONENTS.has(component)
        && (rules === undefined || rules === '' || rules === 'required')) {
        const range = z.tuple([z.date(), z.date()], { required_error: '必填' })
        return rules === 'required' ? range : range.optional()
    }
    if (rules === undefined) return z.string().optional()
    if (typeof rules !== 'string') return rules

    let schema: ZodTypeAny = z.string()
    for (const raw of rules.split(',')) {
        const token = raw.trim()
        if (!token) continue

        if (token === 'required') {
            schema = (schema as ZodString).min(1, '必填')
        } else if (token === 'email') {
            schema = (schema as ZodString).email('邮箱格式错误')
        } else if (token === 'phone') {
            schema = (schema as ZodString).regex(
                /^1[3-9]\d{9}$/,
                '手机号格式错误',
            )
        } else if (token.startsWith('min:')) {
            const n = Number.parseInt(token.slice(4), 10)
            if (Number.isFinite(n) && n >= 0) {
                schema = (schema as ZodString).min(n, `至少 ${n} 个字符`)
            }
        } else if (token.startsWith('max:')) {
            const n = Number.parseInt(token.slice(4), 10)
            if (Number.isFinite(n) && n >= 0) {
                schema = (schema as ZodString).max(n, `最多 ${n} 个字符`)
            }
        }
        // 未知 token 静默忽略
    }
    return schema
}

/**
 * Whether a schema rule rejects an empty/undefined value.
 *
 * String rules use the public DSL consumed by `parseRules`; Zod rules use
 * Zod's optional contract so labels stay in sync with the validation schema.
 */
export function isRequiredRule(
    rules: ZodTypeAny | string | undefined,
): boolean {
    if (rules === undefined) return false
    if (typeof rules === 'string') {
        return rules
            .split(',')
            .some((token) => token.trim() === 'required')
    }

    const schema = rules as ZodTypeAny & {
        isOptional?: () => boolean
    }
    if (typeof schema.isOptional === 'function') {
        try {
            return !schema.isOptional()
        } catch {
            return false
        }
    }

    try {
        return !schema.safeParse(undefined).success
    } catch {
        return false
    }
}
