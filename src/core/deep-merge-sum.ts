type RecordToDeepMergeSum = {
  [key: string]: number | RecordToDeepMergeSum | undefined
}

export const deepMergeSum = (
  record1: RecordToDeepMergeSum,
  record2: RecordToDeepMergeSum
) =>
  Object.entries(record2).reduce(
    (acc, [key, value]): RecordToDeepMergeSum => {
      if (typeof value === 'number') {
        acc[key] = acc[key] || 0
        if (typeof acc[key] === 'number') {
          acc[key] += value
        }
      } else if (typeof value === 'object') {
        acc[key] = acc[key] || {}
        if (typeof acc[key] === 'object') {
          acc[key] = deepMergeSum(acc[key], value)
        }
      }

      return acc
    },
    { ...record1 }
  )
