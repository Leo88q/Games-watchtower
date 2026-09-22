/**
 * L2 / Rollups Layer — Sonic SVM + REPLA + MagicBlock
 */

import { sonicConfig, sonicHealth, sonicHyperGridConfig, sonicSoradaConfig, sonicRushEcsConfig, SONIC_CONFIG } from './sonic.js'
import { replaHealth, replaCliConfig, replaRollupConfig, REPLA_CONFIG } from './repla.js'
import { magicBlockConfig, magicBlockHealth, magicBlockErConfig, magicBlockActionsConfig, MAGICBLOCK_CONFIG } from './magicblock.js'

export function l2LayerConfig(env = process.env) {
  const sonic = sonicConfig(env)
  const repla = replaRollupConfig({ env })
  const magicblock = magicBlockConfig(env)

  return {
    layer: 'l2',
    providers: { sonic, repla, magicblock },
    routing: {
      highFrequency: {
        provider: 'sonic-svm',
        component: 'HyperGrid',
        reason: 'Для игр с высокой частотой действий — выделенный грид, тысячи одновременных действий без конкуренции',
        suitableFor: ['ARES-1 potato colony', 'Neon Relay races', 'real-time PvP'],
      },
      casual: {
        providers: ['repla', 'magicblock'],
        reason: 'Для казуальных игр — gasless UX, sub-10ms, auto actions',
        suitableFor: ['Age of Farming', 'GUTTERCAPS collectibles'],
      },
      readHeavy: {
        provider: 'sonic-svm',
        component: 'Sorada',
        reason: 'Read-операции в 30-40 раз быстрее, 5ms — для лидербордов, инвентаря',
      },
      declarative: {
        provider: 'sonic-svm',
        component: 'Rush (ECS)',
        reason: 'Описываете мир и сущности в конфигах, SDK генерирует контракты',
      }
    },
    strategy: {
      description: 'Sonic SVM (HyperGrid) для игр с высокой частотой действий, REPLA/MagicBlock — для казуальных',
      decisionTree: [
        { if: 'tps > 100 and need isolation', then: 'Sonic HyperGrid' },
        { if: 'need 5ms reads', then: 'Sonic Sorada' },
        { if: 'need declarative world config', then: 'Sonic Rush ECS' },
        { if: 'need L3 with CLI', then: 'REPLA (repla-cli)' },
        { if: 'need gasless + auto triggers', then: 'MagicBlock Ephemeral Rollups + Magic Actions' },
      ]
    },
    configuredCount: [sonic, repla, magicblock].filter(p => p.configured).length,
    writes: false,
    dataQuality: [sonic, repla, magicblock].some(p => p.configured) ? 'partial' : 'unavailable',
  }
}

export function l2Health(env = process.env) {
  return {
    layer: 'l2',
    generatedAt: new Date().toISOString(),
    sonic: sonicHealth(env),
    repla: replaHealth(env),
    magicblock: magicBlockHealth(env),
    summary: l2LayerConfig(env),
    writes: false,
  }
}

export function l2Router({ gameId, tpsRequirement, uxRequirement } = {}) {
  if (tpsRequirement === 'high') return { provider: 'sonic-svm', component: 'HyperGrid', gameId, reason: 'high tps need isolation' }
  if (uxRequirement === 'gasless') return { provider: 'magicblock', component: 'Ephemeral Rollups', gameId, reason: 'gasless UX' }
  if (uxRequirement === 'declarative') return { provider: 'sonic-svm', component: 'Rush ECS', gameId, reason: 'declarative world' }
  return { provider: 'repla', component: 'L3 rollup', gameId, reason: 'default casual' }
}

export { SONIC_CONFIG, REPLA_CONFIG, MAGICBLOCK_CONFIG }
