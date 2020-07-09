import React, { useEffect } from 'react'
import { render, waitFor } from '@testing-library/react'
import {
  ReactQueryCacheProvider,
  makeQueryCache,
  queryCache,
  useQuery,
  useQueryCache,
  queryCaches,
  dehydrate,
} from '../index'
import { sleep } from './utils'

describe('ReactQueryCacheProvider', () => {
  afterEach(() => {
    queryCaches.forEach(cache => cache.clear({ notify: false }))
  })

  test('when not used, falls back to global cache', async () => {
    function Page() {
      const { data } = useQuery('test', async () => {
        await sleep(10)
        return 'test'
      })

      return (
        <div>
          <h1>{data}</h1>
        </div>
      )
    }

    const rendered = render(<Page />)

    await waitFor(() => rendered.getByText('test'))

    expect(queryCache.getQuery('test')).toBeDefined()
  })

  test('sets a specific cache for all queries to use', async () => {
    const cache = makeQueryCache()

    function Page() {
      const { data } = useQuery('test', async () => {
        await sleep(10)
        return 'test'
      })

      return (
        <div>
          <h1>{data}</h1>
        </div>
      )
    }

    const rendered = render(
      <ReactQueryCacheProvider queryCache={cache}>
        <Page />
      </ReactQueryCacheProvider>
    )

    await waitFor(() => rendered.getByText('test'))

    expect(queryCache.getQuery('test')).not.toBeDefined()
    expect(cache.getQuery('test')).toBeDefined()
    cache.clear({ notify: false })
  })

  test('implicitly creates a new cache for all queries to use', async () => {
    function Page() {
      const { data } = useQuery('test', async () => {
        await sleep(10)
        return 'test'
      })

      return (
        <div>
          <h1>{data}</h1>
        </div>
      )
    }

    const rendered = render(
      <ReactQueryCacheProvider>
        <Page />
      </ReactQueryCacheProvider>
    )

    await waitFor(() => rendered.getByText('test'))

    expect(queryCache.getQuery('test')).not.toBeDefined()
  })

  test('allows multiple caches to be partitioned', async () => {
    const cache1 = makeQueryCache()
    const cache2 = makeQueryCache()

    function Page1() {
      const { data } = useQuery('test1', async () => {
        await sleep(10)
        return 'test1'
      })

      return (
        <div>
          <h1>{data}</h1>
        </div>
      )
    }
    function Page2() {
      const { data } = useQuery('test2', async () => {
        await sleep(10)
        return 'test2'
      })

      return (
        <div>
          <h1>{data}</h1>
        </div>
      )
    }

    const rendered = render(
      <>
        <ReactQueryCacheProvider queryCache={cache1}>
          <Page1 />
        </ReactQueryCacheProvider>
        <ReactQueryCacheProvider queryCache={cache2}>
          <Page2 />
        </ReactQueryCacheProvider>
      </>
    )

    await waitFor(() => rendered.getByText('test1'))
    await waitFor(() => rendered.getByText('test2'))

    expect(cache1.getQuery('test1')).toBeDefined()
    expect(cache1.getQuery('test2')).not.toBeDefined()
    expect(cache2.getQuery('test1')).not.toBeDefined()
    expect(cache2.getQuery('test2')).toBeDefined()

    cache1.clear({ notify: false })
    cache2.clear({ notify: false })
  })

  test('when cache changes, previous cache is cleaned', () => {
    let caches = []
    const customCache = makeQueryCache()

    function Page() {
      const queryCache = useQueryCache()
      useEffect(() => {
        caches.push(queryCache)
      }, [queryCache])

      const { data } = useQuery('test', async () => {
        await sleep(10)
        return 'test'
      })

      return (
        <div>
          <h1>{data}</h1>
        </div>
      )
    }

    function App({ cache }) {
      return (
        <ReactQueryCacheProvider queryCache={cache}>
          <Page />
        </ReactQueryCacheProvider>
      )
    }

    const rendered = render(<App />)

    expect(caches).toHaveLength(1)
    jest.spyOn(caches[0], 'clear')

    rendered.rerender(<App cache={customCache} />)

    expect(caches).toHaveLength(2)
    expect(caches[0].clear).toHaveBeenCalled()
    customCache.clear({ notify: false })
  })

  describe('hydration', () => {
    const fetchData = value =>
      new Promise(res => setTimeout(() => res(value), 10))
    const dataQuery = key => fetchData(key)
    let stringifiedQueries

    beforeAll(async () => {
      const serverQueryCache = makeQueryCache()
      await serverQueryCache.prefetchQuery('string', dataQuery)
      const dehydrated = dehydrate(serverQueryCache)
      stringifiedQueries = JSON.stringify(dehydrated)
      serverQueryCache.clear({ notify: false })
    })

    test('should hydrate initialQueries to default cache', async () => {
      const dehydratedQueries = JSON.parse(stringifiedQueries)
      function Page() {
        const { data } = useQuery('string', dataQuery)

        return (
          <div>
            <h1>{data}</h1>
          </div>
        )
      }

      const rendered = render(
        <ReactQueryCacheProvider initialQueries={dehydratedQueries}>
          <Page />
        </ReactQueryCacheProvider>
      )

      rendered.getByText('string')
    })

    test('should hydrate initialQueries to provided cache', async () => {
      const dehydratedQueries = JSON.parse(stringifiedQueries)
      const clientQueryCache = makeQueryCache()

      function Page() {
        const { data } = useQuery('string', dataQuery)
        return (
          <div>
            <h1>{data}</h1>
          </div>
        )
      }

      const rendered = render(
        <ReactQueryCacheProvider
          initialQueries={dehydratedQueries}
          queryCache={clientQueryCache}
        >
          <Page />
        </ReactQueryCacheProvider>
      )

      rendered.getByText('string')
      expect(clientQueryCache.getQuery('string').state.isStale).toBe(false)
      await waitFor(() =>
        expect(clientQueryCache.getQuery('string').state.isStale).toBe(true)
      )

      clientQueryCache.clear({ notify: false })
    })

    test('should hydrate new queries if initialQueries changes', async () => {
      const dehydratedQueries = JSON.parse(stringifiedQueries)
      const clientQueryCache = makeQueryCache()

      function Page({ queryKey }) {
        const { data } = useQuery(queryKey, dataQuery)
        return (
          <div>
            <h1>{data}</h1>
          </div>
        )
      }

      const rendered = render(
        <ReactQueryCacheProvider
          initialQueries={dehydratedQueries}
          queryCache={clientQueryCache}
        >
          <Page queryKey={'string'} />
        </ReactQueryCacheProvider>
      )

      rendered.getByText('string')
      expect(clientQueryCache.getQuery('string').state.isStale).toBe(false)
      await waitFor(() =>
        expect(clientQueryCache.getQuery('string').state.isStale).toBe(true)
      )

      const intermediateCache = makeQueryCache()
      await intermediateCache.prefetchQuery('string', () =>
        dataQuery('should not change')
      )
      await intermediateCache.prefetchQuery('added string', dataQuery)
      const dehydrated = dehydrate(intermediateCache)
      intermediateCache.clear({ notify: false })

      rendered.rerender(
        <ReactQueryCacheProvider
          initialQueries={dehydrated}
          queryCache={clientQueryCache}
        >
          <Page queryKey={'string'} />
          <Page queryKey={'added string'} />
        </ReactQueryCacheProvider>
      )

      // Existing query data should not be overwritten,
      // so this should still be the original data
      rendered.getByText('string')
      // But new query data should be available immediately
      rendered.getByText('added string')
      expect(clientQueryCache.getQuery('added string').state.isStale).toBe(
        false
      )
      await waitFor(() =>
        expect(clientQueryCache.getQuery('added string').state.isStale).toBe(
          true
        )
      )

      clientQueryCache.clear({ notify: false })
    })

    test('should hydrate queries to new cache if cache changes', async () => {
      const dehydratedQueries = JSON.parse(stringifiedQueries)
      const clientQueryCache = makeQueryCache()

      function Page() {
        const { data } = useQuery('string', dataQuery)
        return (
          <div>
            <h1>{data}</h1>
          </div>
        )
      }

      const rendered = render(
        <ReactQueryCacheProvider
          initialQueries={dehydratedQueries}
          queryCache={clientQueryCache}
        >
          <Page />
        </ReactQueryCacheProvider>
      )

      rendered.getByText('string')
      expect(clientQueryCache.getQuery('string').state.isStale).toBe(false)
      await waitFor(() =>
        expect(clientQueryCache.getQuery('string').state.isStale).toBe(true)
      )

      const newClientQueryCache = makeQueryCache()

      rendered.rerender(
        <ReactQueryCacheProvider
          initialQueries={dehydratedQueries}
          queryCache={newClientQueryCache}
        >
          <Page />
        </ReactQueryCacheProvider>
      )

      rendered.getByText('string')
      expect(newClientQueryCache.getQuery('string').state.isStale).toBe(false)
      await waitFor(() =>
        expect(newClientQueryCache.getQuery('string').state.isStale).toBe(true)
      )

      clientQueryCache.clear({ notify: false })
      newClientQueryCache.clear({ notify: false })
    })
  })
})
