import { EventBusError } from '../error'
import { EventBusEvent } from '../event'
import { EventBus } from '../event-bus'
import type { Handler } from '../handler'

describe('EventBus', () => {
  type EventAttributes = { event: string }

  class Event1 extends EventBusEvent<EventAttributes> {}

  class Event2 extends EventBusEvent<EventAttributes> {}

  const handler1: Handler<Event1> = (_event) => {
    return
  }

  const handler2: Handler<Event2> = (_event) => {
    return
  }

  const handler3: Handler<Event2> = (_event) => {
    return 'Handler3 succesfully executed'
  }

  const subscriptions: Array<() => void> = []

  afterEach(() => {
    let unSubscription = subscriptions.pop()
    while (unSubscription) {
      unSubscription()
      unSubscription = subscriptions.pop()
    }
  })

  it('Should not trigger non subscribed handlers', async () => {
    const event = new Event1({ event: 'testEvent' })
    EventBus.emit(event)

    expect(await EventBus.once(event)).toEqual([
      {
        event,
        results: [],
      },
    ])
  })

  it('Should not trigger unsubscribed handlers', async () => {
    EventBus.on(Event1, handler1)()

    const event = new Event1({ event: 'testEvent' })
    EventBus.emit(event)

    expect(await EventBus.once(event)).toEqual([
      {
        event,
        results: [],
      },
    ])
  })

  it('Should trigger subscribed handlers', async () => {
    subscriptions.push(
      EventBus.on(Event1, handler1),
      EventBus.on(Event2, handler2),
      EventBus.on(Event2, handler3)
    )

    const event1 = new Event1({ event: 'testEvent' })
    const event2 = new Event2({ event: 'testEvent' })
    EventBus.emit(event1).emit(event2)

    expect(await EventBus.once(event1, event2)).toEqual([
      {
        event: event1,
        results: [
          {
            handler: handler1,
            result: undefined,
          },
        ],
      },
      {
        event: event2,
        results: [
          {
            handler: handler2,
            result: undefined,
          },
          {
            handler: handler3,
            result: 'Handler3 succesfully executed',
          },
        ],
      },
    ])
  })

  it('Should not introduce memory leak keeping reference to an event Promise result', async () => {
    subscriptions.push(EventBus.on(Event1, handler1))

    const event = new Event1({ event: 'testEvent' })
    EventBus.emit(event)

    await EventBus.once(event)

    expect(await EventBus.once(event)).toEqual([
      {
        event,
        results: [],
      },
    ])
  })

  describe('When handler raises', () => {
    it('Should catch the error', async () => {
      const error = new Error('Something bad happened')

      const handler: Handler<Event1> = () => Promise.reject(error)

      subscriptions.push(EventBus.on(Event1, handler))

      const event = new Event1({ event: 'testEvent' })
      EventBus.emit(event)

      await expect(() => EventBus.once(event)).rejects.toEqual(
        new EventBusError([
          {
            event,
            errors: [
              {
                error,
                handler,
              },
            ],
          },
        ])
      )
    })
  })
})
