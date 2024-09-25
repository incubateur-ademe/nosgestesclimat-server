import mongoose from 'mongoose'
import z from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import { EMAIL_REGEX } from '../../src/core/typeguards/isValidEmail'
import logger from '../../src/logger'
import { VerificationCode } from '../../src/schemas/VerificationCodeSchema'

const VerificationCodeSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    code: z.string().regex(/\d{6}/),
    expirationDate: z.instanceof(Date),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const migrateVerificationCodeToPg = async () => {
  try {
    let documents = 0
    let noEmail = 0
    await mongoose.connect(config.mongo.url)

    const verificationCodes = VerificationCode.find({})
      .lean()
      .cursor({ batchSize: 1000 })

    for await (const rawVerificationCode of verificationCodes) {
      const { code, createdAt, updatedAt, email, expirationDate } =
        VerificationCodeSchema.parse(rawVerificationCode)

      let userId
      const verifiedUser = await prisma.verifiedUser.findFirst({
        where: {
          email,
        },
      })

      if (verifiedUser) {
        userId = verifiedUser.id
      } else {
        const user = await prisma.user.findFirst({
          where: {
            email,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        if (user) {
          userId = user.id
        } else {
          noEmail++
          continue
        }
      }

      const existingCode = await prisma.verificationCode.findFirst({
        where: {
          code,
          email,
          expirationDate,
        },
        select: {
          id: true,
        },
      })

      if (existingCode) {
        await prisma.verificationCode.update({
          where: {
            id: existingCode.id,
          },
          data: {
            userId,
            code,
            email,
            expirationDate,
            createdAt,
            updatedAt,
          },
        })
      } else {
        await prisma.verificationCode.create({
          data: {
            userId,
            code,
            email,
            expirationDate,
            createdAt,
            updatedAt,
          },
        })
      }

      documents++
    }

    logger.info('VerificationCodes imported', { documents, noEmail })
  } catch (error) {
    logger.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateVerificationCodeToPg()
