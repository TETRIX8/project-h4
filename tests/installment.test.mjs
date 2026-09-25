import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateInstallment, MARKUP_RATES } from '../lib/installment.ts'

test('provided example: 100000, 20% deposit, 12 months', () => {
  const result = calculateInstallment({ price: 100000, depositPercent: 20, months: 12, tariff: 'with-deposit' })
  assert.equal(result.deposit, 20000)
  assert.equal(result.principal, 80000)
  assert.equal(result.markup, 38400)
  assert.equal(result.financedTotal, 118400)
  assert.equal(result.total, 138400)
  assert.equal(result.monthly, 9866.67)
  assert.equal(result.schedule[11].amount, 9866.63)
})

test('provided example: 100000, no deposit, 12 months', () => {
  const result = calculateInstallment({ price: 100000, depositPercent: 20, months: 12, tariff: 'without-deposit' })
  assert.equal(result.deposit, 0)
  assert.equal(result.markup, 43200)
  assert.equal(result.total, 143200)
  assert.equal(result.monthly, 11933.33)
  assert.equal(result.schedule[11].amount, 11933.37)
})

test('all terms and boundary amounts reconcile to the kopeck', () => {
  for (const tariff of ['with-deposit', 'without-deposit']) {
    for (const price of [5000, 99999, 250000, 1000000]) {
      for (const depositPercent of [20, 33, 80]) {
        for (let months = 2; months <= 12; months++) {
          const result = calculateInstallment({ tariff, price, depositPercent, months })
          const sum = result.schedule.reduce((total, payment) => total + Math.round(payment.amount * 100), 0)
          assert.equal(sum, Math.round(result.financedTotal * 100))
          assert.equal(Math.round(result.total * 100), sum + Math.round(result.deposit * 100))
          assert.ok(result.schedule.every((payment) => payment.amount > 0))
          if (tariff === 'with-deposit') assert.equal(result.markupPercent, MARKUP_RATES[months])
        }
      }
    }
  }
})

test('invalid and nonfinite inputs are rejected', () => {
  const valid = { price: 250000, depositPercent: 20, months: 6, tariff: 'with-deposit' }
  for (const patch of [{ price: 4999 }, { price: 1000001 }, { price: NaN }, { price: Infinity }, { price: 5000.5 }, { months: 1 }, { months: 13 }, { months: 2.5 }, { months: NaN }, { depositPercent: 19 }, { depositPercent: 81 }, { depositPercent: NaN }, { tariff: 'unknown' }]) {
    assert.throws(() => calculateInstallment({ ...valid, ...patch }))
  }
})
