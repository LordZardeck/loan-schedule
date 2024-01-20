import { describe, expect, mock, it } from 'bun:test'
import {
	calculateSchedule,
	createHolidayChecker,
	generateAnnuityPayments,
	getPaymentDate,
	getPaymentDateOnWorkingDay,
	printSchedule,
	ScheduleConfig,
} from '../src'
import ProdCal from 'prod-cal'

describe('AbstractLoan', () => {
	it('should add month and closest day', () => {
		expect(getPaymentDate(new Date(2013, 4, 1), 33, 31).getTime()).toEqual(new Date(2016, 1, 29).getTime())
	})

	it('should return payment date as next day after holiday', () => {
		expect(
			getPaymentDateOnWorkingDay(new Date(2015, 4, 1), createHolidayChecker(new ProdCal('ru'))).getTime(),
		).toEqual(new Date(2015, 4, 5).getTime())
	})

	it('should return payment date as closet day before holiday if holiday lasts to the end of the month', () => {
		expect(
			getPaymentDateOnWorkingDay(new Date(2015, 4, 31), createHolidayChecker(new ProdCal('ru'))).getTime(),
		).toEqual(new Date(2015, 4, 29).getTime())
	})

	describe('printSchedule', () => {
		it('should print Schedule', () => {
			const printFunction = mock(() => false)

			printSchedule(
				{
					overAllInterest: 0,
					amount: 0,
					fullAmount: 0,
					termLength: 0,
					minPaymentAmount: 0,
					maxPaymentAmount: 0,
					payments: [],
					efficientRate: 0,
				},
				printFunction,
			)
			expect(printFunction).toHaveBeenCalled()
		})
	})

	describe('calculateSchedule', () => {
		it('should require at least 2 payment records', () => {
			expect(() =>
				calculateSchedule(
					{
						amount: 500000,
						rate: 11.5,
						termLength: 12,
						paymentOnDay: 25,
						issueDate: new Date(2018, 9, 25),
					},
					[],
				),
			).toThrow()
		})

		describe('should return the same term length specified', () => {
			it('when no payment amount is specified', () => {
				const config: ScheduleConfig = {
					amount: 26000,
					rate: 18,
					termLength: 60,
					paymentOnDay: 25,
					issueDate: new Date(2018, 9, 25),
				}
				const schedule = calculateSchedule(config, generateAnnuityPayments(config))
				expect(schedule.termLength).toEqual(60)
			})
			it('when no payment amount is specified and date has time', () => {
				const config: ScheduleConfig = {
					amount: 26000,
					rate: 18,
					termLength: 60,
					paymentOnDay: 25,
					issueDate: new Date(2018, 9, 25, 6, 0, 0),
				}
				const schedule = calculateSchedule(config, generateAnnuityPayments(config))
				expect(schedule.termLength).toEqual(60)
			})

			it('when payment amount is specified', () => {
				const config: ScheduleConfig = {
					amount: 26000,
					rate: 18,
					termLength: 60,
					paymentOnDay: 22,
					paymentAmount: 660.23,
					issueDate: new Date(2024, 0, 22),
				}
				const schedule = calculateSchedule(config, generateAnnuityPayments(config))
				expect(schedule.termLength).toEqual(60)
			})
			it('when payment amount is specified and date has time', () => {
				const config: ScheduleConfig = {
					amount: 26000,
					rate: 18,
					termLength: 60,
					paymentOnDay: 22,
					paymentAmount: 660.23,
					issueDate: new Date(2024, 0, 22, 6, 0, 0),
				}
				const schedule = calculateSchedule(config, generateAnnuityPayments(config))
				expect(schedule.termLength).toEqual(60)
			})
		})
	})
})
