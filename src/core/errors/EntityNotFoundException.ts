export class EntityNotFoundException extends Error {
  constructor() {
    super('Entity not found')
  }
}
