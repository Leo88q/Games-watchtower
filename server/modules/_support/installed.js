/**
 * Проверка фактической установки внешних SDK.
 *
 * Модули в server/modules/** описывают внешние SDK (Unity, Godot, Helius, Sonic, Xandeum и др.).
 * «configured: true» допустимо только тогда, когда пакет реально есть в зависимостях проекта,
 * а не потому, что описание существует. Иначе статус должен быть false с причиной.
 */

import { readFileSync } from 'node:fs'

let manifest = { dependencies: {}, devDependencies: {}, optionalDependencies: {} }
try {
  manifest = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'))
} catch {
  manifest = { dependencies: {}, devDependencies: {}, optionalDependencies: {} }
}

export function dependencyInstalled(name) {
  return Boolean(
    manifest.dependencies?.[name] ||
    manifest.devDependencies?.[name] ||
    manifest.optionalDependencies?.[name]
  )
}

export function envConfigured(env, keys = []) {
  return keys.every((key) => env && env[key] !== undefined && env[key] !== '')
}

export function anyEnvConfigured(env, keys = []) {
  return keys.some((key) => env && env[key] !== undefined && env[key] !== '')
}

export const EXTERNAL_SDK_REASON = 'Внешний SDK/сервис не входит в зависимости хаба: модуль описывает возможности и контракт, но не выполняет вызовы.'
