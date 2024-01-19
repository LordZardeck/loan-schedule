import { describe, test, expect, mock } from 'bun:test'
import { AbstractLoanSchedule, LSSchedule } from '../src'
import Decimal from 'decimal.js'

class TestAbstractLoanSchedule extends AbstractLoanSchedule {
	calculateSchedule() {
		return {} as LSSchedule
	}
}

describe('AbstractLoan should', () => {
	test('print Schedule', () => {
		const loanSchedule = new TestAbstractLoanSchedule()
		const printFunction = mock(() => false)

		loanSchedule.printSchedule({ overAllInterest: new Decimal(0), payments: [] }, printFunction)
		expect(printFunction).toHaveBeenCalled()
	})

	test('add month and closest day', () => {
		const loanSchedule = new TestAbstractLoanSchedule()

		expect(loanSchedule.addMonths(33, new Date(2013, 4, 1), 31).getTime()).toEqual(new Date(2016, 1, 29).getTime())
	})

	test('return payment date as next day after holiday', () => {
		const loanSchedule = new TestAbstractLoanSchedule({ prodCalendar: 'ru' })

		expect(loanSchedule.getPaymentDateOnWorkingDay(new Date(2015, 4, 1)).getTime()).toEqual(
			new Date(2015, 4, 5).getTime(),
		)
	})

	test('return payment date as closet day before holiday if holiday lasts to the end of the month', () => {
		const loanSchedule = new TestAbstractLoanSchedule({ prodCalendar: 'ru' })

		expect(loanSchedule.getPaymentDateOnWorkingDay(new Date(2015, 4, 31)).getTime()).toEqual(
			new Date(2015, 4, 29).getTime(),
		)
	})
})
