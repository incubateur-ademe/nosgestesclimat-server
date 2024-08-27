import type winstonLib from 'winston'

const winston = jest.genMockFromModule('winston') as typeof winstonLib

const winstonMock = {
  ...winston,
  format: {
    combine: jest.fn(),
    colorize: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    errors: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
  })),
}

export default winstonMock
