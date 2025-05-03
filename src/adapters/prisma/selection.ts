export const defaultUserSelection = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
}

export const defaultVerifiedUserSelection = {
  id: true,
  name: true,
  email: true,
  position: true,
  telephone: true,
  optedInForCommunications: true,
  createdAt: true,
  updatedAt: true,
}

export const defaultGroupParticipantSelection = {
  id: true,
  user: {
    select: defaultUserSelection,
  },
  simulationId: true,
  createdAt: true,
  updatedAt: true,
}

export const defaultGroupSelectionWithoutParticipants = {
  id: true,
  name: true,
  emoji: true,
  administrator: {
    select: {
      user: {
        select: defaultUserSelection,
      },
    },
  },
  updatedAt: true,
  createdAt: true,
}

export const defaultGroupSelection = {
  ...defaultGroupSelectionWithoutParticipants,
  participants: {
    select: defaultGroupParticipantSelection,
  },
}

export const defaultGroupParticipantSimulationSelection = {
  id: true,
  date: true,
  situation: true,
  foldedSteps: true,
  progression: true,
  actionChoices: true,
  savedViaEmail: true,
  computedResults: true,
  additionalQuestionsAnswers: {
    select: {
      key: true,
      answer: true,
      type: true,
    },
  },
  polls: {
    select: {
      pollId: true,
      poll: {
        select: {
          slug: true,
        },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
}

export const defaultOrganisationSelectionWithoutPolls = {
  id: true,
  name: true,
  slug: true,
  type: true,
  numberOfCollaborators: true,
  administrators: {
    select: {
      id: true,
      user: {
        select: defaultVerifiedUserSelection,
      },
    },
  },
  createdAt: true,
  updatedAt: true,
}

export const defaultOrganisationSelection = {
  ...defaultOrganisationSelectionWithoutPolls,
  polls: {
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  },
}

export const defaultPollSelection = {
  id: true,
  name: true,
  slug: true,
  organisationId: true,
  organisation: {
    select: defaultOrganisationSelectionWithoutPolls,
  },
  funFacts: true,
  defaultAdditionalQuestions: true,
  customAdditionalQuestions: true,
  expectedNumberOfParticipants: true,
  computeRealTimeStats: true,
  createdAt: true,
  updatedAt: true,
  simulations: {
    select: {
      id: true,
      simulation: {
        select: {
          progression: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
}

export const defaultSimulationSelectionWithoutUserAndPoll = {
  id: true,
  date: true,
  model: true,
  situation: true,
  foldedSteps: true,
  progression: true,
  actionChoices: true,
  savedViaEmail: true,
  computedResults: true,
  additionalQuestionsAnswers: {
    select: {
      key: true,
      answer: true,
      type: true,
    },
  },
  createdAt: true,
  updatedAt: true,
}

export const defaultSimulationSelectionWithoutUser = {
  ...defaultSimulationSelectionWithoutUserAndPoll,
  polls: {
    select: {
      pollId: true,
      poll: {
        select: {
          slug: true,
        },
      },
    },
  },
}

export const defaultSimulationSelectionWithoutPoll = {
  ...defaultSimulationSelectionWithoutUserAndPoll,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
}

export const defaultSimulationSelectionWithoutPollAndSituation = {
  ...defaultSimulationSelectionWithoutPoll,
  situation: false,
  foldedSteps: false,
  actionChoices: false,
}

export const defaultSimulationSelection = {
  ...defaultSimulationSelectionWithoutUser,
  ...defaultSimulationSelectionWithoutPoll,
}

export const defaultEmailWhitelistSelection = {
  id: true,
  emailPattern: true,
  description: true,
  apiScopeName: true,
  createdAt: true,
  updatedAt: true,
}
