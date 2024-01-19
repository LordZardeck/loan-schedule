import { describe, test, expect } from 'bun:test'
import { calculateDifferentiatedLoanSchedule } from '../src'
import Decimal from 'decimal.js'

describe('Differentiated Loan Schedule should', () => {
	test('have overall interest eq 3111.18 when params($50000/12m/11.5%/25.10.2016/25)', () => {
		const schedule = calculateDifferentiatedLoanSchedule({
			amount: 50000,
			rate: 11.5,
			term: 12,
			paymentOnDay: 25,
			issueDate: new Date(2016, 9, 25),
		})

		expect(new Decimal(schedule.payments[schedule.payments.length - 1].paymentAmount).toFixed(2)).toEqual('4206.01')
		expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('3111.18')
	})
})
