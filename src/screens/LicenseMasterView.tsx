import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { logout } from '../api/auth'
import { getLicensesList, type License } from '../api/license'
import { createOrder, type OrderItem } from '../api/orders'

export default function LicenseMasterView() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadLicenses()
  }, [])

  async function loadLicenses() {
    setLoading(true)
    setError(null)
    const result = await getLicensesList(0, 10)
    setLoading(false)

    if (result.success) {
      setLicenses(Array.isArray(result.data) ? result.data : [])
      // Initialize quantities to 0 for all licenses
      const initialQuantities: Record<string, number> = {}
      result.data.forEach((license) => {
        const id = license.id
        if (id) {
          initialQuantities[id] = 0
        }
      })
      setQuantities(initialQuantities)
    } else {
      setError(result.message || 'Failed to load licenses')
    }
  }

  function updateQuantity(licenseId: string, quantity: number) {
    setQuantities((prev) => ({
      ...prev,
      [licenseId]: Math.max(0, quantity),
    }))
  }

  function getAmountPerUnit(license: License): number {
    // Use monthly_price (from API) or fallback to amount_per_unit
    if (license.monthly_price) {
      return parseFloat(license.monthly_price) || 0
    }
    return license.amount_per_unit || 0
  }

  function calculateTotalAmount(): number {
    return licenses.reduce((total, license) => {
      const id = license.id
      if (!id) return total
      const quantity = quantities[id] || 0
      const amountPerUnit = getAmountPerUnit(license)
      return total + quantity * amountPerUnit
    }, 0)
  }

  function getSelectedItems(): OrderItem[] {
    return licenses
      .map((license) => {
        const id = license.id
        if (!id) return null
        const quantity = quantities[id] || 0
        if (quantity <= 0) return null
        const amountPerUnit = getAmountPerUnit(license)
        return {
          license_id: id,
          quantity,
          amount_per_unit: amountPerUnit,
        }
      })
      .filter((item): item is OrderItem => item !== null)
  }

  async function handleProceed() {
    const selectedItems = getSelectedItems()
    
    if (selectedItems.length === 0) {
      setError('Please select at least one license with quantity > 0')
      return
    }

    const totalAmount = calculateTotalAmount()
    
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    const result = await createOrder({
      total_amount: totalAmount,
      order_items: selectedItems,
    })

    setSubmitting(false)

    if (result.success) {
      setSuccess(`Order created successfully! Total amount: $${totalAmount.toFixed(2)}`)
      // Optionally navigate to a success page or clear selections
      setTimeout(() => {
        // Reset quantities after successful order
        const resetQuantities: Record<string, number> = {}
        licenses.forEach((license) => {
          const id = license.id
          if (id) {
            resetQuantities[id] = 0
          }
        })
        setQuantities(resetQuantities)
        setSuccess(null)
      }, 3000)
    } else {
      setError(result.message || 'Failed to create order')
    }
  }

  const totalAmount = calculateTotalAmount()
  const hasSelectedItems = getSelectedItems().length > 0

  return (
    <div className="container">
      <nav className="nav" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/">Home</Link>
          <Link to="/purchase">Purchase License</Link>
          <Link to="/transactions">Transactions</Link>
          <Link to="/profile">Profile</Link>
        </div>
        <button type="button" className="btn btn-small btn-danger" onClick={() => logout()}>
          Logout
        </button>
      </nav>

      <div className="card">
        <h1>License Master View</h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Select quantities for each license. The total amount will be calculated automatically.
        </p>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert" style={{ marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading licenses...</p>
          </div>
        ) : licenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No licenses available.</p>
            <button type="button" className="btn btn-primary" onClick={loadLicenses}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>License Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount per Unit</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => {
                    const id = license.id
                    if (!id) return null
                    const quantity = quantities[id] || 0
                    const amountPerUnit = getAmountPerUnit(license)
                    const subtotal = quantity * amountPerUnit

                    return (
                      <tr key={id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>
                          {license.name || `License ${id.slice(0, 8)}`}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          ${amountPerUnit.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 0)}
                            style={{
                              width: '80px',
                              padding: '0.5rem',
                              textAlign: 'center',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>
                          ${subtotal.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>Total Amount:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleProceed}
              disabled={!hasSelectedItems || submitting}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            >
              {submitting ? 'Processing...' : 'Proceed'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
