import { describe, test, expect, beforeAll } from 'bun:test'
import {
	calculateAnnuityLoanSchedule,
	calculateAnnuityPaymentAmount,
	calculateInterestByPeriod,
	calculateMaxLoanAmount,
	ScheduleConfig,
	PaymentType,
} from '../src'
import { Big } from 'big.js'
import ProdCal from 'prod-cal'
import Decimal from 'decimal.js'

function isHoliday(date: Date): boolean {
	const prodCalendar = new ProdCal('ru')

	return prodCalendar.getDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) === ProdCal.DAY_HOLIDAY
}

describe('Annuity loan schedule', () => {
	describe('calculate interest for period', () => {
		test('from 10.12.2015 to 10.01.2016 with params($1000,16.7%) is $14.17', () => {
			expect(
				new Decimal(
					calculateInterestByPeriod({
						from: new Date(2015, 11, 10),
						to: new Date(2016, 0, 10),
						amount: 1000,
						rate: 16.7,
					}),
				).toFixed(2),
			).toEqual('14.17')
		})

		test('from 10.11.2015 to 10.12.2015 with params($1000,16.8%) is $13.81', () => {
			expect(
				new Decimal(
					calculateInterestByPeriod({
						from: new Date(2015, 10, 10),
						to: new Date(2015, 11, 10),
						amount: 1000,
						rate: 16.8,
					}),
				).toFixed(2),
			).toEqual('13.81')
		})
	})

	test('with params($110000/60m/12.9%) has payment amount eq 2497.21', () => {
		const paymentAmount = calculateAnnuityPaymentAmount({
			amount: 110000,
			termLength: 60,
			rate: 12.9,
		})

		expect(new Decimal(paymentAmount).toFixed(2)).toEqual('2497.21')
	})
	test('with params($2497.21/60m/12.9%) has max amount eq 109999.97', () => {
		const maxAmount = calculateMaxLoanAmount({
			paymentAmount: 2497.21,
			termLength: 60,
			rate: 12.9,
		})

		expect(new Decimal(maxAmount).toFixed(2)).toEqual('109999.97')
	})

	test('with params($50000/12m/11.5%/25.10.2018/25) has total interest eq 31684.22', () => {
		const schedule = calculateAnnuityLoanSchedule({
			amount: 500000,
			rate: 11.5,
			termLength: 12,
			paymentOnDay: 25,
			issueDate: new Date(2018, 9, 25),
		})

		expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('31684.22')
	})

	test('with params($50000/12m/11.5%/25.10.2018/25) uses ruCalendar and has total interest eq 31742.50', () => {
		const schedule = calculateAnnuityLoanSchedule(
			{
				amount: 500000,
				rate: 11.5,
				termLength: 12,
				paymentOnDay: 25,
				issueDate: new Date(2018, 9, 25),
			},
			{
				isHoliday,
			},
		)

		expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('31742.50')
	})

	test('with params($50000/12m/11.5%/31.10.2018/25) uses ruCalendar and has total interest eq 31742.50', () => {
		const schedule = calculateAnnuityLoanSchedule(
			{
				amount: 500000,
				rate: 11.5,
				termLength: 12,
				paymentOnDay: 31,
				issueDate: new Date(2018, 9, 31),
			},
			{
				isHoliday,
			},
		)

		expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('31477.89')
	})

	test('with params($50000/24m/11.5%/01.10.2016/28) and has total interest eq 52407.64', () => {
		const schedule = calculateAnnuityLoanSchedule({
			amount: 500000,
			rate: 11.5,
			termLength: 24,
			paymentAmount: 30000,
			paymentOnDay: 28,
			issueDate: new Date(2016, 9, 1),
		})

		expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('52407.64')
		expect(new Decimal(schedule.payments[10].paymentAmount).toFixed(2)).toEqual('30000.00')
		expect(new Decimal(schedule.payments[10].annuityPaymentAmount).toFixed(2)).toEqual('19317.96')
		expect(new Decimal(schedule.payments[15].paymentAmount).toFixed(2)).toEqual('30000.00')
		expect(new Decimal(schedule.payments[15].annuityPaymentAmount).toFixed(2)).toEqual('13591.17')
	})

	describe('with params($50000/12m/11.5%/25.10.2016/25) and early repayment', () => {
		let parameters: ScheduleConfig = {} as ScheduleConfig

		beforeAll(() => {
			parameters = {
				amount: 500000,
				rate: 11.5,
				termLength: 12,
				paymentOnDay: 25,
				issueDate: new Date(2016, 9, 25),
			}
		})

		test('at 25.12.2016/$50000 and has total interest eq 23911.32', () => {
			const schedule = calculateAnnuityLoanSchedule({
				...parameters,
				paymentAmount: 50000,
				earlyRepayments: [
					{
						paymentType: PaymentType.ER_TYPE_MATURITY,
						paymentAmount: 50000,
						paymentDate: new Date(2016, 11, 25),
					},
				],
			})

			expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('23911.32')
		})

		test('at 25.12.2016 and has total interest eq 27155.13', () => {
			const schedule = calculateAnnuityLoanSchedule({
				...parameters,
				earlyRepayments: [
					{
						paymentType: PaymentType.ER_TYPE_MATURITY,
						paymentAmount: 50000,
						paymentDate: new Date(2016, 11, 25),
					},
				],
			})

			expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('27155.13')
		})

		test('at 12.12.2016 and has total interest eq 23690.90', () => {
			const schedule = calculateAnnuityLoanSchedule({
				...parameters,
				paymentAmount: 50000,
				earlyRepayments: [
					{
						paymentType: PaymentType.ER_TYPE_MATURITY,
						paymentAmount: 50000,
						paymentDate: new Date(2016, 11, 12),
					},
				],
			})

			expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('23690.90')
		})

		test('at 12.12.2016 and has total interest eq 8545.27', () => {
			const schedule = calculateAnnuityLoanSchedule({
				...parameters,
				earlyRepayments: [
					{
						paymentType: PaymentType.ER_TYPE_MATURITY,
						paymentAmount: 440000,
						paymentDate: new Date(2016, 11, 12),
					},
				],
			})

			expect(new Decimal(schedule.overAllInterest).toFixed(2)).toEqual('8545.27')
		})
	})
})
