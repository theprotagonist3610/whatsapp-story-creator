// ============================================================
// workflow.js
// Factory, validation et utilitaires pour les workflows.
//
// Un workflow = tableau ordonné de Steps.
// Un Step     = { interface affichée } + { action déclenchée } + { payload }
// ============================================================

import { nanoid } from 'nanoid'
import { INTERFACE_IDS, INTERFACES } from './interfaces.js'
import { ACTIONS, ACTION_IDS, getActionsForInterface } from './actions.js'

// ─── Factory : Step ───────────────────────────────────────────────────────────

/**
 * Crée un step valide avec des valeurs par défaut.
 *
 * @param {Object} params
 * @param {string}  params.interfaceId  - Interface affichée pendant ce step
 * @param {string}  params.actionId     - Action déclenchée
 * @param {Object}  [params.payload]    - Données de l'action (texte, personnage…)
 * @param {number}  [params.duration]   - Durée en ms (null = calculée dynamiquement)
 * @param {string}  [params.note]       - Note libre pour l'éditeur (non rendue)
 * @returns {Object} step
 */
export function createStep({
  interfaceId,
  actionId,
  payload = {},
  duration = null,
  note = '',
}) {
  const action = ACTIONS[actionId]
  if (!action) throw new Error(`Action inconnue : ${actionId}`)

  const resolvedDuration = duration ?? action.defaultDuration

  return {
    id:          nanoid(),
    interfaceId,
    actionId,
    payload:     buildPayload(action, payload),
    duration:    resolvedDuration,
    note,
  }
}

/**
 * Crée un step vide en se basant sur une interface source.
 * Sélectionne automatiquement la première action disponible pour cette interface.
 *
 * @param {string} interfaceId
 * @returns {Object} step
 */
export function createEmptyStep(interfaceId = INTERFACE_IDS.LOCK_SCREEN) {
  const availableActions = getActionsForInterface(interfaceId)
  const defaultAction    = availableActions[0] ?? ACTIONS[ACTION_IDS.PAUSE]

  return createStep({
    interfaceId,
    actionId: defaultAction.id,
    payload:  {},
    duration: defaultAction.defaultDuration,
  })
}

// ─── Factory : Workflow ───────────────────────────────────────────────────────

/**
 * Crée un workflow vide avec un premier step de départ (wakeUp).
 *
 * @param {Object} [options]
 * @param {string} [options.title] - Titre du workflow
 * @returns {Object} workflow
 */
export function createWorkflow({ title = 'Nouveau workflow' } = {}) {
  return {
    id:        nanoid(),
    title,
    steps: [
      createStep({
        interfaceId: '__black__',
        actionId:    ACTION_IDS.WAKE_UP,
        payload:     {},
        duration:    600,
      }),
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Manipulation des steps ───────────────────────────────────────────────────

/**
 * Ajoute un step après l'index donné.
 * L'interface du nouveau step est déduite de la cible de l'action précédente.
 *
 * @param {Object[]} steps  - Tableau de steps existant
 * @param {number}   afterIndex - Index après lequel insérer
 * @returns {Object[]} nouveau tableau de steps (immuable)
 */
export function insertStepAfter(steps, afterIndex) {
  const prevStep      = steps[afterIndex]
  const prevAction    = ACTIONS[prevStep?.actionId]
  const nextInterface = prevAction?.targetInterface ?? INTERFACE_IDS.LOCK_SCREEN

  // Si la cible est null (action transversale sans changement d'interface), garder la même
  const interfaceId = nextInterface === null
    ? prevStep.interfaceId
    : nextInterface === '__black__'
      ? '__black__'
      : nextInterface

  const newStep = createEmptyStep(interfaceId === '__black__' ? INTERFACE_IDS.LOCK_SCREEN : interfaceId)

  const updated = [...steps]
  updated.splice(afterIndex + 1, 0, newStep)
  return updated
}

/**
 * Supprime un step par son id.
 * @param {Object[]} steps
 * @param {string}   stepId
 * @returns {Object[]}
 */
export function removeStep(steps, stepId) {
  return steps.filter((s) => s.id !== stepId)
}

/**
 * Met à jour un step par son id.
 * @param {Object[]} steps
 * @param {string}   stepId
 * @param {Object}   updates - Champs partiels à mettre à jour
 * @returns {Object[]}
 */
export function updateStep(steps, stepId, updates) {
  return steps.map((s) => s.id === stepId ? { ...s, ...updates } : s)
}

/**
 * Réordonne les steps (drag & drop).
 * @param {Object[]} steps
 * @param {number}   fromIndex
 * @param {number}   toIndex
 * @returns {Object[]}
 */
export function reorderSteps(steps, fromIndex, toIndex) {
  const updated = [...steps]
  const [moved] = updated.splice(fromIndex, 1)
  updated.splice(toIndex, 0, moved)
  return updated
}

/**
 * Duplique un step (nouvel id généré).
 * @param {Object[]} steps
 * @param {string}   stepId
 * @returns {Object[]}
 */
export function duplicateStep(steps, stepId) {
  const idx  = steps.findIndex((s) => s.id === stepId)
  if (idx === -1) return steps
  const copy = { ...steps[idx], id: nanoid() }
  const updated = [...steps]
  updated.splice(idx + 1, 0, copy)
  return updated
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Valide un workflow et retourne la liste des erreurs.
 * @param {Object} workflow
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWorkflow(workflow) {
  const errors = []

  if (!workflow?.steps?.length) {
    errors.push('Le workflow est vide.')
    return { valid: false, errors }
  }

  workflow.steps.forEach((step, i) => {
    const n = i + 1

    if (!step.interfaceId) {
      errors.push(`Step ${n} : interface manquante.`)
    } else if (step.interfaceId !== '__black__' && !INTERFACES[step.interfaceId]) {
      errors.push(`Step ${n} : interface inconnue "${step.interfaceId}".`)
    }

    if (!step.actionId) {
      errors.push(`Step ${n} : action manquante.`)
    } else if (!ACTIONS[step.actionId]) {
      errors.push(`Step ${n} : action inconnue "${step.actionId}".`)
    }

    if (step.duration !== null && (typeof step.duration !== 'number' || step.duration < 0)) {
      errors.push(`Step ${n} : durée invalide (doit être un nombre >= 0).`)
    }

    // Vérifie que les champs obligatoires du payload sont renseignés
    const action = ACTIONS[step.actionId]
    if (action) {
      action.payloadSchema.forEach((field) => {
        if (field.required && !step.payload?.[field.key]) {
          errors.push(`Step ${n} : champ obligatoire manquant "${field.label}".`)
        }
      })
    }
  })

  return { valid: errors.length === 0, errors }
}

// ─── Calcul de la durée totale ────────────────────────────────────────────────

/**
 * Calcule la durée totale du workflow en millisecondes.
 * Les steps avec duration=null (ex: writeMessage) utilisent
 * une estimation basée sur la longueur du texte.
 *
 * @param {Object[]} steps
 * @returns {number} durée totale en ms
 */
export function getTotalDuration(steps) {
  return steps.reduce((total, step) => {
    if (step.duration !== null) return total + step.duration

    // Estimation pour writeMessage
    if (step.actionId === ACTION_IDS.WRITE_MESSAGE) {
      const text  = step.payload?.text ?? ''
      const speed = step.payload?.typingSpeed ?? 80
      return total + text.length * speed
    }

    return total + 1000 // fallback
  }, 0)
}

/**
 * Formate une durée en ms vers "Xs" ou "Xm Ys".
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

/**
 * Construit le payload d'un step en appliquant les valeurs par défaut
 * du schéma pour les champs non fournis.
 */
function buildPayload(action, userPayload) {
  const result = {}
  action.payloadSchema.forEach((field) => {
    result[field.key] = userPayload[field.key] !== undefined
      ? userPayload[field.key]
      : field.default
  })
  return result
}
