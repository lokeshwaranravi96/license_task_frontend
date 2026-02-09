import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { logout } from '../api/auth'
import { getOrdersList, type OrderRecord } from '../api/orders'

const PAGE_SIZE = 10

function formatDateShort(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function Transactions() {
  const [list, setList] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const loadPage = useCallback(async (offset: number, append: boolean) => {
    if (append) {
      loadingMoreRef.current = true
      setLoadingMore(true)
    } else setLoading(true)
    const result = await getOrdersList(offset, PAGE_SIZE)
    if (result.success) {
      setList((prev) => (append ? [...prev, ...result.data] : result.data))
      setHasMore(result.data.length >= PAGE_SIZE)
    } else {
      if (!append) setError(result.message)
      setHasMore(false)
    }
    if (append) {
      loadingMoreRef.current = false
      setLoadingMore(false)
    } else setLoading(false)
  }, [])

  useEffect(() => {
    loadPage(0, false)
  }, [loadPage])

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMoreRef.current) return
        loadingMoreRef.current = true
        setList((prev) => {
          const nextOffset = prev.length
          loadPage(nextOffset, true).finally(() => {
            loadingMoreRef.current = false
          })
          return prev
        })
      },
      { rootMargin: '200px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadPage])

  return (
    <div className="container">
      <nav className="nav" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/">Home</Link>
          <Link to="/purchase">Purchase License</Link>
          <Link to="/transactions">Transactions</Link>
        </div>
        <button type="button" className="btn btn-small btn-danger" onClick={() => logout()}>
          Logout
        </button>
      </nav>
      <div className="card">
        <h1>Transaction history</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Your orders and invoices. Scroll down to load more.
        </p>

        {loading && <p>Loading…</p>}
        {error && <div className="alert alert-error">{error}</div>}
        {!loading && !error && list.length === 0 && (
          <p style={{ color: '#6b7280' }}>No transactions yet.</p>
        )}

        {!loading && !error && list.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {list.map((order) => (
              <div
                key={order.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: order.order_items?.length ? '0.75rem' : 0, paddingBottom: order.order_items?.length ? '0.75rem' : 0, borderBottom: order.order_items?.length ? '1px solid #eee' : 'none' }}>
                  <strong style={{ fontSize: '1rem' }}>{order.invoice_no ?? order.id}</strong>
                  <span style={{ color: '#6b7280' }}>{formatDateShort(order.invoice_date)}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: '600' }}>
                    ${order.total_amount != null ? Number(order.total_amount).toFixed(2) : '—'}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{order.payment_status?.name ?? '—'}</span>
                </div>
                {order.order_items?.length ? (
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                    {order.order_items.map((item) => (
                      <li key={item.id} style={{ marginBottom: '0.35rem', color: '#374151' }}>
                        <strong>{item.license?.name ?? 'License'}</strong>
                        {' · '}
                        {formatDateShort(item.purchase_date)} – {formatDateShort(item.expiry_date)}
                        {' · '}
                        Qty {item.quantity}
                        {' · '}
                        ${item.amount_total_qty != null ? Number(item.amount_total_qty).toFixed(2) : '—'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>No items.</p>
                )}
              </div>
            ))}
            <div ref={sentinelRef} style={{ height: 1, visibility: 'hidden' }} aria-hidden />
            {loadingMore && (
              <p style={{ textAlign: 'center', padding: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>Loading more…</p>
            )}
            {!hasMore && list.length > 0 && (
              <p style={{ textAlign: 'center', padding: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>No more records.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
