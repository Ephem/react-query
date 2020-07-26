import { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } from '../core/config'
import { isServer } from '../core/utils'
import { statusSuccess } from 'react-query'

export function dehydrateQuery(query) {
  const dehydratedQuery = {
    config: {},
  }

  // Most config is not dehydrated but instead meant to configure again when
  // consuming the de/rehydrated data, typically with useQuery on the client.
  // Sometimes it might make sense to prefetch data on the server and include
  // in the html-payload, but not consume it on the initial render.
  // We still schedule stale and garbage collection right away, which means
  // we need to specifically include staleTime and cacheTime in dehydration.
  if (query.config.staleTime !== DEFAULT_STALE_TIME) {
    dehydratedQuery.config.staleTime = query.config.staleTime
  }
  if (query.config.cacheTime !== DEFAULT_CACHE_TIME) {
    dehydratedQuery.config.cacheTime = query.config.cacheTime
  }
  if (query.state.data !== undefined) {
    dehydratedQuery.config.initialData = query.state.data
  }
  dehydratedQuery.updatedAt = query.state.updatedAt

  return dehydratedQuery
}

export function dehydrate(queryCache) {
  const dehydratedQueries = {}
  for (const [queryHash, query] of Object.entries(queryCache.queries)) {
    if (query.state.status === statusSuccess) {
      dehydratedQueries[queryHash] = dehydrateQuery(query)
    }
  }

  return dehydratedQueries
}

export function hydrate(
  queryCache,
  dehydratedQueries,
  { queryKeyParserFn = JSON.parse } = {}
) {
  const queriesToInit = []

  for (const [queryHash, query] of Object.entries(dehydratedQueries)) {
    const queryKey = queryKeyParserFn(queryHash)
    const queryConfig = query.config || {}

    queryCache.createQuery(queryKey, queryConfig)
    queryCache.queries[queryHash].state.updatedAt = query.updatedAt

    // We avoid keeping a reference to the query itself here since
    // that would mean the query could not be garbage collected as
    // long as someone kept a reference to the initQueries-function
    queriesToInit.push(queryHash)
  }

  return function initializeQueries() {
    while (queriesToInit.length > 0) {
      const queryHash = queriesToInit.shift()
      const query = queryCache.queries[queryHash]

      if (!isServer && query && query.initializeQuery) {
        query.initializeQuery()
      }
    }
  }
}
