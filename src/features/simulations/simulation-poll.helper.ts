/**
 * Helper functions pour récupérer les informations de poll depuis une simulation
 * Utilise la même logique que pour organisation dans SimulationUpsertedEvent
 */

import type { Simulation } from '@prisma/client'

/**
 * Extrait les slugs des polls associés à une simulation
 * @param simulation - Simulation avec les polls inclus
 * @returns Array des slugs des polls
 */
export const getPollSlugsFromSimulation = (
  simulation: Simulation & {
    polls: Array<{
      pollId: string
      poll: {
        slug: string
      }
    }>
  }
): string[] => {
  return simulation.polls.map(({ poll: { slug } }) => slug)
}

/**
 * Extrait le premier slug de poll associé à une simulation
 * @param simulation - Simulation avec les polls inclus
 * @returns Le premier slug de poll ou undefined
 */
export const getFirstPollSlugFromSimulation = (
  simulation: Simulation & {
    polls: Array<{
      pollId: string
      poll: {
        slug: string
      }
    }>
  }
): string | undefined => {
  return simulation.polls[0]?.poll.slug
}

/**
 * Type pour une simulation avec polls inclus
 */
export type SimulationWithPolls = Simulation & {
  polls: Array<{
    pollId: string
    poll: {
      slug: string
    }
  }>
}
