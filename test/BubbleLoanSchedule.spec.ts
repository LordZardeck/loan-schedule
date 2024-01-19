import { describe, test, expect } from 'bun:test'
import { calculateBubbleLoanSchedule } from '../src'
import Decimal from 'decimal.js'

describe('Bubble Loan Schedule should', () => {
	test('have overall interest eq 5747.13 when params($50000/12m/11.5%/25.10.2016/25)', () => {
		const schedule = calculateBubbleLoanSchedule({
			amount: 50000,
			rate: 11.5,
			term: 12,
			paymentOnDay: 25,
			issueDate: new Date(2016, 9, 25),
		})

		expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('5747.13')
	})
})
