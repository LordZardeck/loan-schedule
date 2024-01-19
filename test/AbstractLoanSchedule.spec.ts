import { describe, test, expect, mock } from 'bun:test'
import { createHolidayChecker, getPaymentDate, getPaymentDateOnWorkingDay, printSchedule } from '../src'
import Decimal from 'decimal.js'
import ProdCal from 'prod-cal'

describe('AbstractLoan should', () => {
	test('print Schedule', () => {
		const printFunction = mock(() => false)

		printSchedule({ overAllInterest: new Decimal(0), payments: [] }, printFunction)
		expect(printFunction).toHaveBeenCalled()
	})

	test('add month and closest day', () => {
		expect(getPaymentDate(new Date(2013, 4, 1), 33, 31).getTime()).toEqual(new Date(2016, 1, 29).getTime())
	})

	test('return payment date as next day after holiday', () => {
		expect(
			getPaymentDateOnWorkingDay(new Date(2015, 4, 1), createHolidayChecker(new ProdCal('ru'))).getTime(),
		).toEqual(new Date(2015, 4, 5).getTime())
	})

	test('return payment date as closet day before holiday if holiday lasts to the end of the month', () => {
		expect(
			getPaymentDateOnWorkingDay(new Date(2015, 4, 31), createHolidayChecker(new ProdCal('ru'))).getTime(),
		).toEqual(new Date(2015, 4, 29).getTime())
	})
})
