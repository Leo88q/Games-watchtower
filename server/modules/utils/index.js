/**
 * Utils Layer — Claude Skill + other utils
 */

import { claudeSkillSetup, claudeSkillHealth, CLAUDE_SKILL_CONFIG } from './claude-skill.js'

export function utilsLayerConfig(env = process.env) {
  const claudeSkill = claudeSkillSetup({ gameId: 'generic' })
  return {
    layer: 'utils',
    skills: {
      claude: CLAUDE_SKILL_CONFIG,
    },
    setups: { claudeSkill },
    strategy: {
      aiDevelopment: {
        skill: 'Solana Game Skill for Claude Code',
        purpose: 'набор навыков skill addon для Claude который добавляет в контекст специфические паттерны для Solana-геймдева: Unity SDK, Mobile Wallet Adapter, архитектура состояний ончейн vs оффчейн и тестирование',
        benefit: 'Если используете AI в разработке это может ускорить генерацию корректного кода',
        useFor: 'All teams using AI (Claude) for code generation — Unity Godot Unreal Web Backend L2 Analytics Marketplace',
      },
    },
    writes: false,
    dataQuality: 'partial',
  }
}

export function utilsHealth(env = process.env) {
  return {
    layer: 'utils',
    generatedAt: new Date().toISOString(),
    claudeSkill: claudeSkillHealth(env),
    summary: utilsLayerConfig(env),
    writes: false,
  }
}

export { CLAUDE_SKILL_CONFIG }
export { claudeSkillSetup }
