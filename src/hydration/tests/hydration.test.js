import { sleep } from '../../core/tests/utils'
import { makeQueryCache } from '../../core'
import { dehydrate, hydrate } from '../hydration'

describe('dehydration and rehydration', () => {
  test('should work with serializeable values', async () => {
    // "Server part"
    const queryCache = makeQueryCache()
    const fetchData = value => Promise.resolve(value)
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    await queryCache.prefetchQuery('number', () => fetchData(1))
    await queryCache.prefetchQuery('boolean', () => fetchData(true))
    await queryCache.prefetchQuery('null', () => fetchData(null))
    await queryCache.prefetchQuery('array', () => fetchData(['string', 0]))
    await queryCache.prefetchQuery('nested', () =>
      fetchData({ key: [{ nestedKey: 1 }] })
    )
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // "Client part"
    const parsed = JSON.parse(stringified)
    const clientQueryCache = makeQueryCache()
    const initQueries = hydrate(clientQueryCache, parsed)
    initQueries()
    expect(clientQueryCache.getQuery('string').state.data).toBe('string')
    expect(clientQueryCache.getQuery('number').state.data).toBe(1)
    expect(clientQueryCache.getQuery('boolean').state.data).toBe(true)
    expect(clientQueryCache.getQuery('null').state.data).toBe(null)
    expect(clientQueryCache.getQuery('array').state.data).toEqual(['string', 0])
    expect(clientQueryCache.getQuery('nested').state.data).toEqual({
      key: [{ nestedKey: 1 }],
    })

    const fetchDataClientSide = jest.fn()
    await clientQueryCache.prefetchQuery('string', fetchDataClientSide)
    await clientQueryCache.prefetchQuery('number', fetchDataClientSide)
    await clientQueryCache.prefetchQuery('boolean', fetchDataClientSide)
    await clientQueryCache.prefetchQuery('null', fetchDataClientSide)
    await clientQueryCache.prefetchQuery('array', fetchDataClientSide)
    await clientQueryCache.prefetchQuery('nested', fetchDataClientSide)
    expect(fetchDataClientSide).toHaveBeenCalledTimes(0)

    queryCache.clear({ notify: false })
    clientQueryCache.clear({ notify: false })
  })

  test('should default to scheduling staleness immediately', async () => {
    // "Server part"
    const queryCache = makeQueryCache()
    const fetchData = value => Promise.resolve(value)
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // "Client part"
    const parsed = JSON.parse(stringified)
    const clientQueryCache = makeQueryCache()
    const initQueries = hydrate(clientQueryCache, parsed)
    initQueries()
    expect(clientQueryCache.getQuery('string').state.data).toBe('string')
    expect(clientQueryCache.getQuery('string').state.isStale).toBe(false)
    await sleep(10)
    expect(clientQueryCache.getQuery('string').state.isStale).toBe(true)

    queryCache.clear({ notify: false })
    clientQueryCache.clear({ notify: false })
  })

  test('should respect staleTime', async () => {
    // "Server part"
    const queryCache = makeQueryCache()
    const fetchData = value => Promise.resolve(value)
    await queryCache.prefetchQuery('string', () => fetchData('string'), {
      staleTime: 50,
    })
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // "Client part"
    const parsed = JSON.parse(stringified)
    const clientQueryCache = makeQueryCache()
    const initQueries = hydrate(clientQueryCache, parsed)
    initQueries()
    expect(clientQueryCache.getQuery('string').state.data).toBe('string')
    expect(clientQueryCache.getQuery('string').state.isStale).toBe(false)
    await sleep(10)
    expect(clientQueryCache.getQuery('string').state.isStale).toBe(false)
    await sleep(50)
    expect(clientQueryCache.getQuery('string').state.isStale).toBe(true)

    queryCache.clear({ notify: false })
    clientQueryCache.clear({ notify: false })
  })

  test('should schedule garbage collection', async () => {
    // "Server part"
    const queryCache = makeQueryCache()
    const fetchData = value => Promise.resolve(value)
    await queryCache.prefetchQuery('string', () => fetchData('string'), {
      cacheTime: 50,
    })
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // "Client part"
    const parsed = JSON.parse(stringified)
    const clientQueryCache = makeQueryCache()
    const initQueries = hydrate(clientQueryCache, parsed)
    initQueries()
    expect(clientQueryCache.getQuery('string').state.data).toBe('string')
    await sleep(10)
    expect(clientQueryCache.getQuery('string')).toBeTruthy()
    await sleep(50)
    expect(clientQueryCache.getQuery('string')).toBeFalsy()

    queryCache.clear({ notify: false })
    clientQueryCache.clear({ notify: false })
  })

  test('should work with complex keys', async () => {
    // "Server part"
    const queryCache = makeQueryCache()
    const fetchData = value => Promise.resolve(value)
    await queryCache.prefetchQuery(
      ['string', { key: ['string'], key2: 0 }],
      () => fetchData('string')
    )
    const dehydrated = dehydrate(queryCache)
    const stringified = JSON.stringify(dehydrated)

    // "Client part"
    const parsed = JSON.parse(stringified)
    const clientQueryCache = makeQueryCache()
    const initQueries = hydrate(clientQueryCache, parsed)
    initQueries()
    expect(
      clientQueryCache.getQuery(['string', { key: ['string'], key2: 0 }]).state
        .data
    ).toBe('string')

    const fetchDataClientSide = jest.fn()
    await clientQueryCache.prefetchQuery(
      ['string', { key: ['string'], key2: 0 }],
      fetchDataClientSide
    )
    expect(fetchDataClientSide).toHaveBeenCalledTimes(0)

    queryCache.clear({ notify: false })
    clientQueryCache.clear({ notify: false })
  })

  test('should not include default config in dehydration', async () => {
    const queryCache = makeQueryCache()
    const fetchData = value => Promise.resolve(value)
    await queryCache.prefetchQuery('string', () => fetchData('string'))
    const dehydrated = dehydrate(queryCache)

    // This is testing implementation details that can change and are not
    // part of the public API, but is important for keeping the payload small
    // Exact shape is not important here, just that staleTime and cacheTime
    // (and any future other config) is not included in it
    expect(dehydrated['["string"]'].staleTime).toBe(undefined)
    expect(dehydrated['["string"]'].cacheTime).toBe(undefined)
  })
})
