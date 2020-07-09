import React from 'react'
import {
  queryCache as defaultQueryCache,
  queryCaches,
  makeQueryCache,
  hydrate,
} from '../core'

export const queryCacheContext = React.createContext(defaultQueryCache)

export const useQueryCache = () => React.useContext(queryCacheContext)

export function ReactQueryCacheProvider({
  queryCache,
  initialQueries,
  children,
}) {
  const resolvedQueryCache = React.useMemo(
    () => queryCache || makeQueryCache(),
    [queryCache]
  )

  // TODO: Add tests for initialQueries including initQueries
  const initializeQueries = React.useMemo(() => {
    if (initialQueries) {
      return hydrate(resolvedQueryCache, initialQueries)
    }
  }, [resolvedQueryCache, initialQueries])

  React.useEffect(() => {
    if (initializeQueries) {
      initializeQueries()
    }
  }, [initializeQueries])

  React.useEffect(() => {
    queryCaches.push(resolvedQueryCache)

    return () => {
      // remove the cache from the active list
      const i = queryCaches.indexOf(resolvedQueryCache)
      if (i > -1) {
        queryCaches.splice(i, 1)
      }
      // if the resolvedQueryCache was created by us, we need to tear it down
      if (queryCache == null) {
        resolvedQueryCache.clear({ notify: false })
      }
    }
  }, [resolvedQueryCache, queryCache])

  return (
    <queryCacheContext.Provider value={resolvedQueryCache}>
      {children}
    </queryCacheContext.Provider>
  )
}
