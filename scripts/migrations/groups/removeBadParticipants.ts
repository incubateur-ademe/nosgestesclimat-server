import type { AnyBulkWriteOperation } from 'mongodb'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import { Group } from '../../../src/schemas/GroupSchema'

type AggregatedGroup = {
  _id: mongoose.Types.ObjectId
  participantsToRemove: [mongoose.Types.ObjectId]
}

/**
 * This script find all groups participants
 * with no simulation and no user and delete them
 */
async function removeBadParticipants() {
  console.log('Start groups remove bad participants migration')

  mongoose.connect(config.mongo.url)

  try {
    const groups = Group.aggregate([
      {
        $unwind: '$participants',
      },
      {
        $lookup: {
          from: 'simulations',
          localField: 'participants.simulation',
          foreignField: '_id',
          as: 'participants.simulation',
        },
      },
      {
        $unwind: {
          path: '$participants.simulation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'participants.simulation': null,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants.userId',
          foreignField: '_id',
          as: 'participants.userId',
        },
      },
      {
        $unwind: {
          path: '$participants.userId',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'participants.userId': null,
        },
      },
      {
        $group: {
          _id: '$_id',
          participantsToRemove: { $addToSet: '$participants._id' },
        },
      },
    ]).cursor<AggregatedGroup>()

    let updated = 0
    const bulkWrites: AnyBulkWriteOperation[] = []

    for await (const group of groups) {
      const participantsToRemove = new Set(
        group.participantsToRemove.map((id) => id.toString())
      )

      const { participants } = await Group.findById(group._id, {
        participants: true,
      })
        .orFail(new Error(`Group not found ${group._id}`))
        .lean()

      bulkWrites.push({
        updateOne: {
          filter: {
            _id: group._id,
          },
          update: {
            $set: {
              participants: participants.filter(
                (p) => !participantsToRemove.has(p._id!.toString())
              ),
            },
          },
        },
      })

      if (bulkWrites.length >= 1000) {
        const { modifiedCount } = await Group.bulkWrite(bulkWrites)
        updated += modifiedCount
        bulkWrites.length = 0
        console.log('Updated groups', updated)
      }
    }

    if (bulkWrites.length) {
      const { modifiedCount } = await Group.bulkWrite(bulkWrites)
      updated += modifiedCount
      bulkWrites.length = 0
    }

    console.log(
      'Bad groups participants migration done. Updated groups',
      updated
    )
  } catch (error) {
    console.error('Error migrating groups', error)
  } finally {
    mongoose.disconnect()
  }
}

removeBadParticipants()
