import { describe, it } from 'vitest'
import { reactive, ref } from 'vue-demi'
import { QueryClient } from '../queryClient'
import { queryOptions } from '../queryOptions'
import { useQuery } from '../useQuery'
import { doNotExecute } from './test-utils'
import type { dataTagSymbol } from '@tanstack/query-core'
import type { Equal, Expect } from './test-utils'

describe('queryOptions', () => {
  it('should not allow excess properties', () => {
    doNotExecute(() => {
      return queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
        // @ts-expect-error this is a good error, because stallTime does not exist!
        stallTime: 1000,
      })
    })
  })
  it('should infer types for callbacks', () => {
    doNotExecute(() => {
      return queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
        staleTime: 1000,
        select: (data) => {
          const result: Expect<Equal<number, typeof data>> = true
          return result
        },
      })
    })
  })
  it('should work when passed to useQuery', () => {
    doNotExecute(() => {
      const options = queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
      })

      const { data } = reactive(useQuery(options))

      const result: Expect<Equal<typeof data, number | undefined>> = true

      return result
    })
  })
  it('should tag the queryKey with the result type of the QueryFn', () => {
    doNotExecute(() => {
      const { queryKey } = queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
      })

      const result: Expect<
        Equal<(typeof queryKey)[typeof dataTagSymbol], number>
      > = true
      return result
    })
  })
  it('should tag the queryKey even if no promise is returned', () => {
    doNotExecute(() => {
      const { queryKey } = queryOptions({
        queryKey: ['key'],
        queryFn: () => 5,
      })

      const result: Expect<
        Equal<(typeof queryKey)[typeof dataTagSymbol], number>
      > = true
      return result
    })
  })
  it('should tag the queryKey with unknown if there is no queryFn', () => {
    doNotExecute(() => {
      const { queryKey } = queryOptions({
        queryKey: ['key'],
      })

      const result: Expect<
        Equal<(typeof queryKey)[typeof dataTagSymbol], unknown>
      > = true
      return result
    })
  })
  it('should tag the queryKey with the result type of the QueryFn if select is used', () => {
    doNotExecute(() => {
      const { queryKey } = queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
        select: (data) => data.toString(),
      })

      const result: Expect<
        Equal<(typeof queryKey)[typeof dataTagSymbol], number>
      > = true
      return result
    })
  })
  it('should return the proper type when passed to getQueryData', () => {
    doNotExecute(() => {
      const { queryKey } = queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
      })

      const queryClient = new QueryClient()
      const data = queryClient.getQueryData(queryKey)

      const result: Expect<Equal<typeof data, number | undefined>> = true
      return result
    })
  })
  it('should properly type updaterFn when passed to setQueryData', () => {
    doNotExecute(() => {
      const { queryKey } = queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
      })

      const queryClient = new QueryClient()
      const data = queryClient.setQueryData(queryKey, (prev) => {
        const result: Expect<Equal<typeof prev, number | undefined>> = true
        return result ? prev : 1
      })

      const result: Expect<Equal<typeof data, number | undefined>> = true
      return result
    })
  })
  it('should properly type value when passed to setQueryData', () => {
    doNotExecute(() => {
      const { queryKey } = queryOptions({
        queryKey: ['key'],
        queryFn: () => Promise.resolve(5),
      })

      const queryClient = new QueryClient()

      // @ts-expect-error value should be a number
      queryClient.setQueryData(queryKey, '5')
      // @ts-expect-error value should be a number
      queryClient.setQueryData(queryKey, () => '5')

      const data = queryClient.setQueryData(queryKey, 5)

      const result: Expect<Equal<typeof data, number | undefined>> = true
      return result
    })
  })
  it('should allow to be passed to QueryClient methods while containing ref in queryKey', () => {
    doNotExecute(() => {
      const options = queryOptions({
        queryKey: ['key', ref(1), { nested: ref(2) }],
        queryFn: () => Promise.resolve(5),
      })

      const queryClient = new QueryClient()

      // Should not error
      const data = queryClient.invalidateQueries(options)
      // Should not error
      const data2 = queryClient.fetchQuery(options)

      const result: Expect<Equal<typeof data, Promise<void>>> = true
      const result2: Expect<Equal<typeof data2, Promise<number>>> = true
      return result || result2
    })
  })
})
