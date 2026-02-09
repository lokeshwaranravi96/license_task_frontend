import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { getLicensesList, type LicenseItem, type License } from '../api/license'
import { createOrder } from '../api/orders'
import { getActiveOrder, type ActiveOrderData } from '../api/orders'

const defaultRow: LicenseItem = { pricePerMonth: 0, months: 1, quantity: 1 }

/** Days from today (start of day) to last date of expiry (inclusive). Minimum 0. */
function daysFromTodayToExpiry(expiryIso: string): number {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const expiry = new Date(expiryIso)
  expiry.setUTCHours(0, 0, 0, 0)
  const diffMs = expiry.getTime() - today.getTime()
  const diffDays = diffMs / (24 * 60 * 60 * 1000)
  // Include both today and expiry date: floor(diffDays) + 1, or 0 if already past
  if (diffDays < 0) return 0
  return Math.floor(diffDays) + 1
}

/** Prorated amount for remaining period: (monthly_price / remainingDays) * daysLeft * quantity */
function proratedAmount(pricePerMonth: number, remainingDays: number, daysLeft: number, quantity: number): number {
  if (remainingDays <= 0) return 0
  const perDay = pricePerMonth / remainingDays
  return daysLeft * perDay * quantity
}

/** Amount when no proration: price × quantity (no months). */
function priceQuantityAmount(pricePerMonth: number, quantity: number): number {
  return pricePerMonth * (quantity || 1)
}

function getRowTotal(
  row: LicenseItem,
  activeOrder: ActiveOrderData | null
): { total: number; prorated: number; fullMonths: number; daysLeft: number; perDayCost: number } {
  const price = row.pricePerMonth || 0
  const qty = row.quantity || 1

  if (!activeOrder || activeOrder.remainingDays <= 0) {
    const full = priceQuantityAmount(price, qty)
    return { total: full, prorated: 0, fullMonths: full, daysLeft: 0, perDayCost: 0 }
  }

  const daysLeft = daysFromTodayToExpiry(activeOrder.expiry)
  const perDayCost = price / activeOrder.remainingDays
  const prorated = proratedAmount(price, activeOrder.remainingDays, daysLeft, qty)
  // Proration only: total = prorated amount (no extra months)
  return { total: prorated, prorated, fullMonths: 0, daysLeft, perDayCost }
}

function sumTotal(rows: LicenseItem[], activeOrder: ActiveOrderData | null): number {
  return rows.reduce((acc, r) => acc + getRowTotal(r, activeOrder).total, 0)
}

/** Effective amount per unit for API: same proration logic as total. No proration = pricePerMonth; with proration = prorated amount for one unit. */
function getAmountPerUnit(row: LicenseItem, activeOrder: ActiveOrderData | null): number {
  const price = row.pricePerMonth || 0
  if (!activeOrder || activeOrder.remainingDays <= 0) return price
  const daysLeft = daysFromTodayToExpiry(activeOrder.expiry)
  const perDayCost = price / activeOrder.remainingDays
  return daysLeft * perDayCost
}


export default function PurchaseLicense() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LicenseItem[]>([{ ...defaultRow }])
  const [licenses, setLicenses] = useState<License[]>([])
  const [activeOrder, setActiveOrder] = useState<ActiveOrderData | null>(null)
  const [loadingLicenses, setLoadingLicenses] = useState(true)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showInvoiceScreen, setShowInvoiceScreen] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceTotal, setInvoiceTotal] = useState(0)
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false)

  useEffect(() => {
    loadLicenses()
    loadActiveOrder()
  }, [])

  useEffect(() => {
    if (!showPurchaseSuccess) return
    const timer = setTimeout(() => {
      navigate('/', { replace: true })
    }, 3000)
    return () => clearTimeout(timer)
  }, [showPurchaseSuccess, navigate])

  async function loadLicenses() {
    setLoadingLicenses(true)
    const result = await getLicensesList(0, 100) // Load more licenses
    setLoadingLicenses(false)
    if (result.success) {
      setLicenses(result.data)
    } else {
      setMessage({ type: 'error', text: result.message || 'Failed to load licenses' })
    }
  }

  async function loadActiveOrder() {
    const result = await getActiveOrder()
    if (result.success) {
      setActiveOrder(result.data)
    } else {
      setActiveOrder(null)
    }
  }

  function addRow() {
    setRows((prev) => [...prev, { ...defaultRow }])
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: 'pricePerMonth' | 'quantity', value: number) {
    setRows((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  function selectLicense(i: number, licenseId: string) {
    const license = licenses.find((l) => l.id === licenseId)
    if (!license) return

    setRows((prev) => {
      const next = [...prev]
      next[i] = {
        ...next[i],
        licenseId: license.id,
        licenseName: license.name,
        pricePerMonth: parseFloat(license.monthly_price) || 0,
      }
      return next
    })
  }

  // Get available licenses for a row (exclude already selected ones)
  function getAvailableLicenses(rowIndex: number): License[] {
    const selectedIds = rows
      .map((r, idx) => (idx !== rowIndex && r.licenseId ? r.licenseId : null))
      .filter((id): id is string => id !== null)
    return licenses.filter((l) => !selectedIds.includes(l.id))
  }

  function handlePurchase() {
    setMessage(null)
    const rowsWithLicense = rows.filter((r) => r.licenseId && (r.pricePerMonth ?? 0) > 0)
    if (rowsWithLicense.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one license.' })
      return
    }
    if (rows.some((r) => !r.licenseId)) {
      setMessage({ type: 'error', text: 'Please select a license for all rows.' })
      return
    }
    setLoading(true)
    getActiveOrder().then((result) => {
      setLoading(false)
      const totalRecords = result.success ? (result.data.totalRecords ?? 0) : 0
      setInvoiceNo(`INV-${totalRecords + 1}`)
      setInvoiceTotal(sumTotal(rows, activeOrder))
      setShowInvoiceScreen(true)
    })
  }

  async function handleConfirmAndPay() {
    setMessage(null)
    const rowsWithLicense = rows.filter((r) => r.licenseId && (r.pricePerMonth ?? 0) > 0)
    if (rowsWithLicense.length === 0) return
    const totalAmount = sumTotal(rows, activeOrder)
    const orderItems = rowsWithLicense.map((r) => ({
      license_id: r.licenseId!,
      quantity: r.quantity ?? 1,
      amount_per_unit: Math.round(getAmountPerUnit(r, activeOrder) * 100) / 100,
    }))
    setLoading(true)
    const result = await createOrder({ total_amount: totalAmount, order_items: orderItems })
    setLoading(false)
    if (result.success) {
      setShowInvoiceScreen(false)
      setShowPurchaseSuccess(true)
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }

  const total = sumTotal(rows, activeOrder)

  // Disable "Add License Row" when all licenses are already selected in rows
  const selectedLicenseIds = new Set(rows.map((r) => r.licenseId).filter(Boolean) as string[])
  const allLicensesUsed = licenses.length > 0 && selectedLicenseIds.size >= licenses.length

  if (showPurchaseSuccess) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: '3rem', textAlign: 'center', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ color: '#059669', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Successfully purchased</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Redirecting to dashboard in 3 seconds...</p>
        </div>
      </div>
    )
  }

  if (showInvoiceScreen) {
    const rowsWithLicense = rows.filter((r) => r.licenseId && (r.pricePerMonth ?? 0) > 0)
    const today = new Date()
    const purchaseDate = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    const formatBilling = (d: Date) => `${d.getDate().toString().padStart(2, '0')}-${d.toLocaleString('en', { month: 'short' })}-${d.getFullYear()}`
    const billingStart = today
    const billingEnd = activeOrder?.expiry ? new Date(activeOrder.expiry) : (() => { const d = new Date(today); d.setMonth(d.getMonth() + 1);d.setDate(d.getDate() - 1);  return d })()
    const billingPeriod = `${formatBilling(billingStart)} to ${formatBilling(billingEnd)}`
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
        <div className="card" style={{ maxWidth: '560px', margin: '2rem auto', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', letterSpacing: '0.05em' }}>INVOICE</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#6b7280' }}>License Purchase</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Invoice No</div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{invoiceNo}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Purchase Date</div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{purchaseDate}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Billing Period</div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>{billingPeriod}</div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem 0.6rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>License</th>
                <th style={{ textAlign: 'right', padding: '0.6rem 0.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price/Unit</th>
                <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '0.6rem 0 0.6rem 0.5rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithLicense.map((r, i) => {
                const perQty = getAmountPerUnit(r, activeOrder)
                const qty = r.quantity ?? 1
                const lineTotal = getRowTotal(r, activeOrder).total
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 0.5rem 0.75rem 0' }}>{r.licenseName ?? 'License'}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>${perQty.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{qty}</td>
                    <td style={{ padding: '0.75rem 0 0.75rem 0.5rem', textAlign: 'right' }}>${lineTotal.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.75rem', marginBottom: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ marginRight: '2rem', fontSize: '0.95rem', color: '#374151' }}>Total</span>
            <strong style={{ fontSize: '1.15rem', minWidth: '80px', textAlign: 'right' }}>${invoiceTotal.toFixed(2)}</strong>
          </div>
          {message && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{message.text}</div>}
          <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => handleConfirmAndPay()} disabled={loading}>
            {loading ? 'Placing order…' : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    )
  }

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
        <h1>Purchase License</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Select licenses and specify quantity. Amount = price × quantity (proration applied when you have an active order).
        </p>
        {activeOrder && activeOrder.remainingDays > 0 && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '0.9rem' }}>
            <strong>Proration active:</strong> {activeOrder.remainingDays} days until expiry ({activeOrder.expiry}). Per-day = price ÷ {activeOrder.remainingDays}; amount = days × per-day × quantity.
          </div>
        )}

        {loadingLicenses ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading licenses...</div>
        ) : (
          <>
            {rows.map((row, i) => {
              const availableLicenses = getAvailableLicenses(i)
              const rowCalc = getRowTotal(row, activeOrder)
              const useProration = activeOrder != null && activeOrder.remainingDays > 0

              return (
                <div
                  key={i}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: '#f9fafb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <label style={{ minWidth: '100px', fontWeight: '500' }}>License:</label>
                    <select
                      value={row.licenseId || ''}
                      onChange={(e) => {
                        if (e.target.value) selectLicense(i, e.target.value)
                      }}
                      style={{
                        flex: '1',
                        minWidth: '200px',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                      required
                    >
                      <option value="">-- Select License --</option>
                      {availableLicenses.length === 0 ? (
                        <option value="" disabled>
                          No available licenses (all selected in other rows)
                        </option>
                      ) : (
                        availableLicenses.map((license) => (
                          <option key={license.id} value={license.id}>
                            {license.name} - ${parseFloat(license.monthly_price).toFixed(2)}/month
                          </option>
                        ))
                      )}
                    </select>
                    {availableLicenses.length > 0 && (
                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        ({availableLicenses.length} available)
                      </span>
                    )}
                    {row.licenseName && (
                      <span style={{ color: '#059669', fontWeight: '500', fontSize: '0.9rem' }}>
                        Selected: {row.licenseName}
                      </span>
                    )}
                  </div>

                  {row.licenseId && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <label style={{ minWidth: '100px', fontWeight: '500' }}>Price/month:</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.pricePerMonth || ''}
                          onChange={(e) => updateRow(i, 'pricePerMonth', Number(e.target.value) || 0)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            width: '120px',
                          }}
                          readOnly
                        />
                        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>(Auto-filled from license)</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <label style={{ minWidth: '100px', fontWeight: '500' }}>Quantity:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => updateRow(i, 'quantity', Math.max(1, (row.quantity || 1) - 1))}
                            style={{
                              padding: '0.25rem 0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              background: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={row.quantity || 1}
                            onChange={(e) => updateRow(i, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              width: '80px',
                              textAlign: 'center',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateRow(i, 'quantity', (row.quantity || 1) + 1)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              background: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #e5e7eb',
                        }}
                      >
                        <div>
                          {useProration ? (
                            <strong style={{ color: '#374151' }}>
                              {row.licenseName}: Prorated ({rowCalc.daysLeft} days × ${rowCalc.perDayCost.toFixed(2)}/day × {row.quantity || 1}) = ${rowCalc.total.toFixed(2)}
                            </strong>
                          ) : (
                            <strong style={{ color: '#374151' }}>
                              {row.licenseName}: ${row.pricePerMonth.toFixed(2)} × {row.quantity || 1} = ${rowCalc.total.toFixed(2)}
                            </strong>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => removeRow(i)}
                          disabled={rows.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            <button
              type="button"
              className="add-btn"
              onClick={addRow}
              disabled={allLicensesUsed}
              style={{ marginBottom: '1.5rem' }}
              title={allLicensesUsed ? 'All licenses already added. Remove a row to add another.' : undefined}
            >
              + Add License Row
            </button>

            <div
              className="summary"
              style={{
                background: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '8px',
                padding: '1.5rem',
                marginTop: '1rem',
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#166534' }}>
                Overall Total
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                Total Amount: ${total.toFixed(2)}
              </div>
            </div>
          </>
        )}

        {message && (
          <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '1rem' }}>
            {message.text}
          </div>
        )}

        <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handlePurchase} disabled={loading}>
          {loading ? 'Processing…' : 'Purchase'}
        </button>
      </div>
    </div>
  )
}
