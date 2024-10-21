import express from 'express'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

import { faker } from '@faker-js/faker'
import supertest from 'supertest'
import { prisma } from '../../adapters/prisma/client'
import { config } from '../../config'
import { COOKIE_MAX_AGE } from '../../features/authentication/authentication.service'
import { authentificationMiddleware } from '../authentificationMiddleware'

const app = express()
app.use(express.json())
app.use(authentificationMiddleware)
app.use((_, res) => res.status(StatusCodes.NO_CONTENT).end())

describe('authentication middleware', () => {
  const agent = supertest(app)

  describe('With no cookie', () => {
    it(`Should return a ${StatusCodes.UNAUTHORIZED} error`, async () => {
      await agent.get('/').expect(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('With incorrect cookie', () => {
    it(`Should return a ${StatusCodes.UNAUTHORIZED} error`, async () => {
      await agent
        .get('/')
        .set('cookie', 'NEXT_LOCALE=fr')
        .expect(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('With invalid cookie', () => {
    it(`Should return a ${StatusCodes.UNAUTHORIZED} error`, async () => {
      await agent
        .get('/')
        .set('cookie', 'ngcjwt=invalid cookie')
        .expect(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('With incorrect and invalid cookie', () => {
    it(`Should return a ${StatusCodes.UNAUTHORIZED} error`, async () => {
      const cookies = faker.helpers.arrayElements(
        ['ngcjwt=invalid cookie', 'NEXT_LOCALE=fr'],
        2
      )

      await agent
        .get('/')
        .set('cookie', cookies.join(' ; '))
        .expect(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('With valid cookie', () => {
    let token: string
    let userId: string
    let email: string

    it(`Should return a ${StatusCodes.NO_CONTENT} and a cookie`, async () => {
      userId = faker.string.uuid()
      email = faker.internet.email()
      token = jwt.sign({ email, userId }, config.security.jwt.secret, {
        expiresIn: COOKIE_MAX_AGE,
      })

      const response = await agent
        .get('/')
        .set('cookie', `ngcjwt=${token}`)
        .expect(StatusCodes.NO_CONTENT)

      const [cookie] = response.headers['set-cookie']
      const userToken = cookie.split(';').shift()?.replace('ngcjwt=', '')

      expect(jwt.decode(userToken!)).toEqual({
        userId,
        email,
        exp: expect.any(Number),
        iat: expect.any(Number),
      })
    })

    describe('And no userId present', () => {
      describe('And user does not exist in database', () => {
        it(`Should return a ${StatusCodes.NO_CONTENT} and a cookie`, async () => {
          email = faker.internet.email()
          token = jwt.sign({ email }, config.security.jwt.secret, {
            expiresIn: COOKIE_MAX_AGE,
          })

          const response = await agent
            .get('/')
            .set('cookie', `ngcjwt=${token}`)
            .expect(StatusCodes.NO_CONTENT)

          const [cookie] = response.headers['set-cookie']
          const userToken = cookie.split(';').shift()?.replace('ngcjwt=', '')

          expect(jwt.decode(userToken!)).toEqual({
            email,
            exp: expect.any(Number),
            iat: expect.any(Number),
          })
        })
      })

      describe('And user does exist in database', () => {
        afterEach(async () => prisma.verifiedUser.deleteMany())

        it(`Should return a ${StatusCodes.NO_CONTENT} and a cookie`, async () => {
          email = faker.internet.email()
          ;({ id: userId } = await prisma.verifiedUser.create({
            data: {
              email,
              id: faker.string.uuid(),
            },
            select: {
              id: true,
            },
          }))

          token = jwt.sign({ email }, config.security.jwt.secret, {
            expiresIn: COOKIE_MAX_AGE,
          })

          const response = await agent
            .get('/')
            .set('cookie', `ngcjwt=${token}`)
            .expect(StatusCodes.NO_CONTENT)

          const [cookie] = response.headers['set-cookie']
          const userToken = cookie.split(';').shift()?.replace('ngcjwt=', '')

          expect(jwt.decode(userToken!)).toEqual({
            userId,
            email,
            exp: expect.any(Number),
            iat: expect.any(Number),
          })
        })
      })
    })
  })

  describe('With incorrect and valid cookie', () => {
    it(`Should return a ${StatusCodes.NO_CONTENT} and a cookie`, async () => {
      const userId = faker.string.uuid()
      const email = faker.internet.email()
      const token = jwt.sign({ email, userId }, config.security.jwt.secret, {
        expiresIn: COOKIE_MAX_AGE,
      })

      const cookies = faker.helpers.arrayElements(
        [`ngcjwt=${token}`, 'NEXT_LOCALE=fr'],
        2
      )

      const response = await agent
        .get('/')
        .set('cookie', cookies.join(' ; '))
        .expect(StatusCodes.NO_CONTENT)

      const [cookie] = response.headers['set-cookie']
      const userToken = cookie.split(';').shift()?.replace('ngcjwt=', '')

      expect(jwt.decode(userToken!)).toEqual({
        userId,
        email,
        exp: expect.any(Number),
        iat: expect.any(Number),
      })
    })
  })
})