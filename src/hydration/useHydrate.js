import React from 'react'
import { hydrate } from './hydration'
import { useQueryCache } from 'react-query'

export function useHydrate(queries) {
  const queryCache = useQueryCache()

  // Running hydrate again with the same queries is safe,
  // it wont overwrite or initialize existing queries,
  // relying on useMemo here is only a performance optimization
  const initializeQueries = React.useMemo(() => {
    if (queries) {
      return hydrate(queryCache, queries)
    }
  }, [queryCache, queries])

  React.useEffect(() => {
    if (initializeQueries) {
      initializeQueries()
    }
  }, [initializeQueries])
}
